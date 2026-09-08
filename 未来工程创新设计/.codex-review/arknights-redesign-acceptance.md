# 月序 UI 重设计 · 2026-09-08

## 已实现

- 参考 https://ak.hypergryph.com/ 实际页面截图：黑白主色、青色强调、顶部双语导航、主视觉占据画面、细线任务导航。
- 保留现有三维建筑、三个任务和仿真接口；楼层/房间调度与观察/分析分别由顶部入口展开，一次只显示一个面板。
- 首屏移除常驻房间详情、楼层网格、性能读数；性能检测迁入画质设置。
- 所有可见 DOM 字体计算字重为 700；三维贴图文字也使用 700 字重。
- 中文实际嵌入 Adobe 思源宋体 SC Bold，子集家族名 Lunaris Serif；当前界面中文缺字 0。
- 英文声明优先使用 Novecento Wide Bold；本机及项目未找到该字体，实测当前回退到 Space Grotesk Bold。此项未宣称完成。
- 可将可用 Webfont 放到 vendor/fonts/novecento-wide-bold.woff2 后重新运行 node build-simulation.cjs，构建将自动嵌入。
- 构建仍输出可独立打开的单文件 HTML，字体准备后再生成三维文字贴图。

## 验证

- node simulation-test.cjs：通过机械状态、1000 次合法移动、六向连接和人流守恒等现有检查。
- node lunar-validation.cjs --source：15/15 通过。
- node lunar-validation.cjs：15/15 通过；使用实际单文件中的脚本，DOM/GPU 为 mock。
- 对现有 mock 补充 Element.closest、精确 querySelectorAll 分支和字体加载微任务支持。
- 实际内置浏览器：主场景渲染、观察面板、热力开关、面板互斥、L2 单层观察/恢复全景、播放/暂停与重播已检查。
- 窄屏 390 × 844：标题两行、导航、场景及固定播放栏可见。
- 桌面 1280 × 720：无横向溢出，可见文字无低于 700 的字重，浏览器无控制台 error；思源字体 loaded、英文后备 loaded、Novecento 本地字体加载失败。
- 截图：arknights-desktop.png、arknights-mobile.png。截图不是 GPU 性能或工程可行性证据。

原 UI 和构建文件保存在 .codex-review/pre-arknights/。
