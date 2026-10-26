# Focus Deck · 本地设计与验收记录

- 状态：本地预览，未发布，未推送；项目独立目录，不涉及其他仓库。编辑前原版留存 `.backups/index.pre-resume-20261026-1545.html`；入口源文件 `index.html`。
- 方向：Apple Clean；淡紫环境背景、主计时圆环、柔和连续表面和克制的动作反馈。无外部字体、图片和脚本依赖。
- 来源：已读取本机 apple-web-design/SKILL.md、WORKFLOW.md、frontend-dual-source/SKILL.md、FRONTEND_DUAL_SOURCE_GATE.md；Designeer /inspiration 与 /resources 网络访问失败，独立案例研究未完成，不能声明双源设计门全部通过。Taste app-screens 源文件受 Mice Hole 工作区路径限制未读，未运行 Taste draw/inspect。
- 交互：三种计时模式（25/5/15分钟）、开始暂停重置、任务增删完成选择、localStorage 持久化任务及已完成专注、今日与七日统计。
- 统计定义：仅完整结束的25分钟专注计数；未完成计时不计入分钟。2026-10-26 已增加计时恢复：开始/暂停/重置/模式切换/任务选择即时写入 localStorage；运行中存储截止时间，刷新或重新打开时按真实经过时间恢复，过期专注按原截止日期结算且只计一次。
- 本地访问：http://127.0.0.1:19377/
- 浏览器：Mice Hole 通过 headless Chromium 保存 320/390/768/1440px 截图。320px 初稿模式文本折行，已缩短标签，需二次截图确认。
- 验收（2026-10-26）：使用本机 Edge headless + DevTools Protocol 隔离浏览器用户目录完成真实交互自动化测试，涵盖初始渲染、运行计时刷新恢复、暂停刷新不走秒、过期专注只记一次、休息不计入番茄钟、任务选择与模式持久化，全部通过。脚本：`.backups/focus-resume-e2e.cjs`；320px/390px/1440px 截图检查无新增布局异常。未做 WebKit / iOS Safari 真机验证；液态折射不是本版特性，未冒称真 Liquid Glass。
- 本轮补充自动化回归：`node tests/timer-persistence-check.cjs`，隔离 Edge 临时配置和本地服务，不使用真实用户存储；10/10 通过（含既有任务/统计保留、刷新时继续计时、暂停保存、模式/任务保持、截止时单次结算、重置、320/390px 无横向滚动）。2026-10-26 已再次运行确认通过。
- 视觉人工门：用户尚未审阅，ART_APPROVED=false。
