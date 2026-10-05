# 部署

Fanotter 是纯静态站，服务器上不跑任何 Fanotter 的进程，也不存任何数据。CI 把打包好的文件发到服务器的一个目录里，由服务器上已有的 Web 服务器（反向代理）直接提供。

## 流程

推送到 `main` 后，[deploy.yml](../.github/workflows/deploy.yml) 会：

1. `npm ci && npm run build`，把 `dist/` 存成构建产物；
2. SSH 到服务器建 `$DEPLOY_PATH/releases/<commit sha>/`，用 scp 把 `dist/` 传进去；
3. 确认 `index.html` 存在后，原子地把 `$DEPLOY_PATH/current` 软链指向新版本，只保留最近 5 个版本。

```
$DEPLOY_PATH/              例如 /srv/fanotter
  releases/<sha>/          每次部署一个目录
  current -> releases/<sha>
```

切换只是改一个软链，不会出现一半新一半旧的页面；Web 服务器直接读目录，不需要重启。

也可以在 Actions 页面手动运行 workflow（不受 `ENABLE_AUTO_DEPLOY` 限制）。

## 服务器上要准备的

1. **DNS**：给 Fanotter 的域名加 A 记录指向服务器。
2. **目录**：用部署用的 SSH 用户执行
   ```bash
   sudo mkdir -p /srv/fanotter/releases
   sudo chown -R "$USER":"$USER" /srv/fanotter
   ```
3. **Web 服务器**：把 Fanotter 的域名指向 `/srv/fanotter/current`，并把找不到的路径回退到 `index.html`（前端路由）。Caddy 的站点块：

   ```caddyfile
   fan.example.com {
     encode gzip
     root * /srv/fanotter/current

     # Vite 打包的资源文件名带哈希，可以长期缓存；index.html 不缓存，切换版本后立刻生效
     @assets path /assets/*
     header @assets Cache-Control "public, max-age=31536000, immutable"
     header /index.html Cache-Control "no-cache"

     try_files {path} /index.html
     file_server
   }
   ```

   Caddy 跑在 Docker 里时，要把 `/srv/fanotter` 只读挂载进容器。Nginx 的写法是 `root /srv/fanotter/current;` 加 `try_files $uri /index.html;`。

## GitHub 仓库设置

Settings → Secrets and variables → Actions：

| 类型 | 名称 | 值 |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | 服务器 IP 或域名 |
| Secret | `DEPLOY_USER` | SSH 用户 |
| Secret | `DEPLOY_SSH_KEY` | 该用户的私钥 |
| Secret | `DEPLOY_PATH` | `/srv/fanotter` |
| Variable | `ENABLE_AUTO_DEPLOY` | `true` |

## 回滚

```bash
cd /srv/fanotter
ls -1t releases/            # 看有哪些版本
ln -sfn releases/<上一个 sha> current.tmp && mv -T current.tmp current
```

## 排查

| 现象 | 看什么 |
| --- | --- |
| 404 | `ls -l /srv/fanotter/current` 是否存在并指向有 `index.html` 的目录；Actions 的 deploy job 是否跑了（看 `ENABLE_AUTO_DEPLOY`）；Web 服务器容器里是否挂载了 `/srv/fanotter` |
| 刷新子页面 404 | Web 服务器是否配置了回退到 `index.html` |
| Actions 里 scp 失败 | `DEPLOY_USER` 对 `/srv/fanotter` 是否有写权限 |
| 页面是旧的 | `index.html` 是否设了 `no-cache`；`readlink /srv/fanotter/current` 是否是最新 sha |
