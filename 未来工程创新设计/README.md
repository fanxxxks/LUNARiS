# LUNARIS 7 · 月面空间重构工作台

24 个房间、42 个节点、5 层空间，支持内部 XYZ 搬运、六向连接、自然语言调度和假设人流分析。基础仿真为单文件离线 HTML；GLM-5.3 自然语言调度通过本机 Node.js 服务连接并行科技平台。

## 运行与构建

- Windows 双击 `启动高性能仿真.cmd`，自动启动本机模型服务并打开高性能浏览器；也可执行 `npm start` 后访问 `http://127.0.0.1:8787`。需要 Node.js 20+ 与本机密钥配置，见使用与维护文档。
- 直接打开 `月宫华容_三维仿真软件.html` 可离线演示，保留规则式直线调度；分层和模糊调度需通过上述本机服务启动。
- 打开 `assets/textures/index.html` 查看材质图册；图册需要保留整个 `assets/textures/` 目录。
- 在本目录执行 `npm run build`，或 `node scripts/build-simulation.cjs`，重建仿真成品。
- 冯院长人物支持可收起侧栏、人物高亮、45 项带具体动机的自主活动、自然语言多站行程，以及搬运后行走和上下梯；使用方式见 `docs/冯院长功能使用说明.md`。
- 修改角色素材后执行 `npm ci`、`npm run build:character`、`npm run build`；`character/README.md` 列出了必须保留的 6 个源动画。`npm run test:character` 运行人物调度检查。
- 修改 UI 文案后，执行 `python -m pip install -r requirements.txt`、`npm run build:fonts`，再构建 HTML。
- 修改材质源图或材质定义后，执行 `npm ci`、`npm run build:textures`，再构建 HTML。仅打包 HTML 不需要安装 npm 依赖。

开发使用 Node.js 20 或更高版本；字体构建另需 Python。构建脚本根据自身位置定位项目，可从其它工作目录调用。

## 项目结构

```text
未来工程创新设计/
├─ 月宫华容_三维仿真软件.html   # 可复制、可离线运行的成品
├─ 启动高性能仿真.cmd          # Windows 启动入口
├─ llm-config.json            # 随仓库保存的模型 API 配置
├─ src/
│  ├─ core/                  # 拓扑、搬运规划、自然语言调度
│  │  ├─ simulation.js
│  │  └─ scheduler.js
│  ├─ server/server.cjs      # 本机页面服务、GLM-5.3 意图解析与密钥隔离
│  ├─ scene/                 # 场景与渲染
│  │  ├─ scene.js            # 地形、框架、公共材质与实例状态
│  │  ├─ modules.js          # 舱体、舱门及八类模型轮廓
│  │  ├─ interiors.js        # 双层舱内设备与家具
│  │  ├─ connectivity.js     # 连接件、舱口时序与人流显示
│  │  ├─ surfaces.js         # 材质贴图与表面映射
│  │  ├─ studio-transition.js # 图鉴点云切换与科技线条背景
│  │  └─ renderer.js         # 抗锯齿、后处理与性能统计
│  ├─ ui/                    # 页面模板、样式、交互与播放
│  │  ├─ template.html
│  │  ├─ style.css
│  │  └─ app.js
│  └─ generated/texture-pack.js  # 由源图生成的离线材质包
├─ scripts/                  # HTML、字体、材质构建及启动器
├─ assets/textures/          # 原图、PBR 通道、材质清单与图册
│  ├─ source/
│  ├─ pbr/
│  ├─ gallery/               # 图册实际引用的内景图片
│  ├─ manifest.json
│  ├─ catalog-data.js
│  └─ index.html
├─ vendor/                   # Three.js、字体源文件和许可证
├─ docs/
│  ├─ 使用与维护.md
│  └─ 方案/                  # 正式方案 Markdown 与历史 Word
├─ package.json              # 统一构建命令与材质构建依赖
├─ package-lock.json
└─ requirements.txt          # 字体构建依赖
```

## 文件关系与维护边界

`scripts/build-simulation.cjs` 是打包顺序的唯一入口。它依次内嵌 Three.js、核心逻辑和场景交互，并将模板、样式、字体和后台规划 Worker 合成为根目录 HTML。修改源码后必须重新构建成品。

`src/core/` 可通过 CommonJS 在 Node.js 中加载，也会作为浏览器全局对象运行。`scheduler.js` 依赖 `simulation.js`。

`src/server/server.cjs` 只监听本机，读取项目根目录的 `llm-config.json` 并调用并行科技 API。该配置随仓库保存。模型将自然语言转换为排列、分层、集中、靠近、分离及锁定约束，`scheduler.js` 在浏览器 Worker 中搜索真实路线，再由 `simulation.js` 校验路径和终态。服务器代码及密钥不会打包进 HTML。

`src/scene/` 和 `src/ui/app.js` 目前共享一个闭包：`scene.js` 开始闭包，`app.js` 结束闭包。中间文件共享材质、几何、实例和状态，依赖函数声明提升。调整文件时保持构建列表顺序，不能直接拆成多个独立 script 标签。舱门辅助函数与舱体轮廓已合并到 `modules.js`；内饰、连接与渲染仍按职责分开。

`scripts/build-textures.cjs` 从 `assets/textures/source/` 生成 PBR 文件、`manifest.json`、图册数据及 `src/generated/texture-pack.js`。修改源图或该脚本中的材质定义，避免直接手改生成包。

`scripts/build-fonts.py` 扫描 UI 模板及非生成的 JS 源码，以 `vendor/fonts/sources/` 为输入生成字体子集和覆盖报告。第三方许可证保存在 `vendor/`，字体许可同时嵌入成品。

使用说明、材质通道和人工检查步骤集中在[使用与维护](docs/使用与维护.md)。正式设计方案在 `docs/方案/`；其中历史版本的尺寸和运动架构以文档版本为准。
