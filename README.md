<p align="center">
  <img src="public/icons/icon-192.png" width="96" height="96" alt="Fanotter" />
</p>

<h1 align="center">Fanotter</h1>

<p align="center">本周新番放送表。只做一件事：按北京时间看每天播出什么，点进去看详情。</p>

![本周排表](docs/week.jpg)

<table>
  <tr>
    <td width="68%"><img src="docs/detail.jpg" alt="番剧详情" /></td>
    <td width="32%"><img src="docs/mobile.jpg" alt="手机版" /></td>
  </tr>
</table>

## 功能

- **本周排表**：一次看一天。桌面顶部是吸顶的星期切换，带每天的数量；手机底部是星期胶囊栏。键盘 ← → 也能切换。
- **每部番**：海报、名称、播出时间（北京时间）、当前集数、两行简介。卡片背后用海报模糊出一层光晕。
- **详情页**：评分、在看 / 想看人数、放送时间、首播日期、下一集、标签、简介、全部剧集（已播 / 下一集 / 未播）、角色与声优、制作信息、官网链接。
- **可当独立应用用**：带 PWA 清单和图标，Safari「添加到程序坞」或手机「添加到主屏幕」后以独立窗口打开。
- **离线可用**：看过的数据都在本地缓存里，断网也能打开。

纯前端，没有后端，也没有自己的数据库。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 类型检查 + 打包到 dist/
```

打包后的 `dist/` 放到任何静态托管上即可。路由是 History 模式，服务器需要把所有路径回退到 `index.html`。

## 部署

推送到 `main` 后由 GitHub Actions 构建并通过 SSH 发布到服务器，和 Beaver 共用同一个 Caddy，走子域名。服务器端只需一个目录和 Caddy 的一个站点块，步骤、密钥配置和回滚方法见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

## 数据来源

| 数据 | 来源 | 缓存 |
| --- | --- | --- |
| 本周放送的番剧、海报、评分、在看人数 | [Bangumi API](https://bangumi.github.io/api/) `GET /calendar` | 6 小时 |
| 播出时间（Bangumi 的接口不带时间） | [bangumi-data](https://github.com/bangumi-data/bangumi-data)，jsDelivr 上的 `dist/data.json` | 24 小时，只存解析后的索引 |
| 番剧详情、简介、标签、制作信息 | `GET /v0/subjects/{id}` | 7 天 |
| 剧集列表 | `GET /v0/episodes?subject_id=` | 1 天 |
| 角色与声优 | `GET /v0/subjects/{id}/characters` | 7 天 |

所有接口都允许跨域，浏览器直接调用。

## 缓存策略

按需加载，没有定时器。只在页面需要某条数据时才请求，请求前先查缓存。

`src/lib/cache.ts` 是三层：内存 → IndexedDB → 网络。每条数据记录写入时间和过期时长，过期才重新请求；请求失败时退回旧数据；同一个 key 的并发请求只发一次。

列表页的简介在 `/calendar` 里大多是空的，卡片滚进视口后才单独请求一次详情，最多 3 个并发。bangumi-data 原文件近 8MB，解析后只把「条目 id → 星期、时间、首播日」的索引存进缓存。

## 放送时间的处理

- bangumi-data 的 `broadcast`（形如 `R/2026-10-02T13:00:00Z/P7D`）优先，没有就用 `begin`，统一换算成北京时间。
- 一部番归到哪一天，按换算后的北京时间星期算；没有时间数据的番沿用 Bangumi 给的星期，排在当天最后。
- 当前集数按首播日期往后每周加一推算，只对周更番准确；详情页的剧集列表用的是 Bangumi 的真实排期。
- 「本周」是周一到周日。

## 结构

```
src/
  api/bangumi.ts     Bangumi 接口与类型
  api/airtime.ts     bangumi-data 放送时间索引
  lib/cache.ts       缓存层
  lib/time.ts        北京时间、本周日期、集数推算
  lib/schedule.ts    合成一周七天的排表
  pages/Week.tsx     本周排表
  pages/Detail.tsx   番剧详情
  components/        Header、Card、DayBar
  styles.css         样式，液态玻璃效果在 .glass
public/
  manifest.webmanifest, icons/   PWA 清单与图标
icon/fanotter-icon.png           图标源图（1024×1024）
docs/                            截图
```

技术栈：Vite、React、TypeScript、react-router、idb-keyval。

## 致谢

数据来自 [Bangumi 番组计划](https://bgm.tv) 和 [bangumi-data](https://github.com/bangumi-data/bangumi-data)。海报等图片版权归各自权利方所有。

## 许可

Apache-2.0，见 [LICENSE](LICENSE)。
