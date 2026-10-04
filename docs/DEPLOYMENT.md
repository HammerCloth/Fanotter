# 部署：和 Beaver 共用一台服务器、一个 Caddy

Fanotter 是纯静态站，不需要自己的容器。服务器上 Beaver 的 Caddy 已经占着 80/443，让它多服务一个子域名就行：Caddy 自动申请证书，Fanotter 的构建产物放在服务器上的一个目录里，由 Caddy 直接提供。

下面以子域名 `fan.example.com` 为例，把 `example.com` 换成你的域名。

## 结构

```
服务器
  /srv/fanotter/                 ← GitHub Actions 上传到这里（DEPLOY_PATH）
    releases/<commit sha>/        每次部署一个目录
    current -> releases/<sha>    软链，指向正在线上的版本
  /opt/Beaver/（或你放 Beaver 的地方）
    docker-compose.yml           caddy 服务多挂一个卷：/srv/fanotter → /srv/fanotter
    Caddyfile                    多一个站点块，root 指向 /srv/fanotter/current
    .env                         多一行 FANOTTER_SITE=fan.example.com
```

发布 = 上传新目录 + 原子切换软链，中途不会出现一半新一半旧的页面；回滚 = 把软链指回上一个目录。

## 1. DNS

在域名的 DNS 控制台加一条 A 记录：主机名 `fan` → 服务器公网 IP。等解析生效（`dig fan.example.com` 能看到 IP）再往下做，否则 Caddy 申请证书会失败并反复重试。

## 2. 服务器上建目录

用部署用的那个 SSH 用户（和 Beaver 的 `DEPLOY_USER` 一样即可）：

```bash
sudo mkdir -p /srv/fanotter/releases
sudo chown -R "$USER":"$USER" /srv/fanotter
```

## 3. 改 Beaver 的 Caddy 配置

仓库里 [beaver-caddy.patch](beaver-caddy.patch) 是对 Beaver 的 `Caddyfile` 和 `docker-compose.yml` 的改动，在 Beaver 仓库根目录执行：

```bash
git apply /path/to/beaver-caddy.patch
```

改动只有两处：

**Caddyfile** 末尾多一个站点块：

```caddyfile
{$FANOTTER_SITE:fanotter.localhost} {
  log {
    output stdout
    format console
  }

  encode gzip

  root * /srv/fanotter/current

  # Vite 打包的资源文件名带哈希，可以长期缓存；index.html 不缓存
  @assets path /assets/*
  header @assets Cache-Control "public, max-age=31536000, immutable"
  header /index.html Cache-Control "no-cache"

  try_files {path} /index.html
  file_server
}
```

**docker-compose.yml** 的 `caddy` 服务多一个环境变量和一个卷：

```yaml
    environment:
      CADDY_SITE: ${CADDY_SITE:-:80}
      FANOTTER_SITE: ${FANOTTER_SITE:-fanotter.localhost}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./frontend-vue/dist:/srv/frontend:ro
      - /srv/fanotter:/srv/fanotter:ro
```

没设置 `FANOTTER_SITE` 时站点地址是 `fanotter.localhost`，不影响 Beaver 本身，所以这个改动可以先合并再配域名。

然后在服务器上 Beaver 的 `.env` 里加一行，并重建 Caddy：

```bash
echo 'FANOTTER_SITE=fan.example.com' >> .env
docker compose up -d --force-recreate caddy
docker compose logs -f caddy      # 看到为 fan.example.com 签发证书的日志即可
```

这时访问 `https://fan.example.com` 会是 404，因为还没有 `current`，第一次部署后就正常了。

## 4. GitHub 仓库里配置部署

在 Fanotter 仓库的 Settings → Secrets and variables → Actions：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | 服务器 IP 或域名 |
| Secret | `DEPLOY_USER` | SSH 用户 |
| Secret | `DEPLOY_SSH_KEY` | 该用户的私钥（和 Beaver 用同一把即可） |
| Secret | `DEPLOY_PATH` | `/srv/fanotter` |
| Variable | `ENABLE_AUTO_DEPLOY` | `true` |

命名和 Beaver 完全一样，只是 `DEPLOY_PATH` 的值不同。

## 5. 发布

推送到 `main` 后，[deploy.yml](../.github/workflows/deploy.yml) 会：

1. `npm ci && npm run build`，把 `dist/` 存成构建产物；
2. SSH 到服务器建 `releases/<sha>/`，用 scp 把 `dist/` 传进去；
3. 确认 `index.html` 存在后，原子地把 `current` 指向新版本，只保留最近 5 个版本。

也可以在 Actions 页面手动运行 workflow（不受 `ENABLE_AUTO_DEPLOY` 限制）。

Caddy 直接读目录，不需要重启。

## 回滚

```bash
cd /srv/fanotter
ls -1t releases/            # 看有哪些版本
ln -sfn releases/<上一个 sha> current.tmp && mv -T current.tmp current
```

## 排查

| 现象 | 看什么 |
| --- | --- |
| 证书错误 / 连不上 | `docker compose logs caddy`。DNS 是否已指向本机；`.env` 里 `FANOTTER_SITE` 是否和浏览器地址一致；改完 `.env` 要 `--force-recreate caddy` |
| 404 | 服务器上 `ls -l /srv/fanotter/current` 是否存在并指向有 `index.html` 的目录；Actions 的 deploy job 是否跑了（看 `ENABLE_AUTO_DEPLOY`） |
| 刷新子页面 404 | Caddyfile 里 `try_files {path} /index.html` 是否在 Fanotter 的站点块里 |
| Actions 里 scp 失败 | `DEPLOY_USER` 对 `/srv/fanotter` 是否有写权限（第 2 步的 chown） |
| 页面是旧的 | Caddy 对 `index.html` 已设 `no-cache`；强刷一次，或检查 `readlink /srv/fanotter/current` |
