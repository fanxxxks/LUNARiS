# 冯院长角色源动画

当前保留的 6 个 GLB 都被 `scripts/build-character.cjs` 使用，请保留。

| 目录 | 文件名中的动作 | 用途 |
| --- | --- | --- |
| `Meshy_AI_business_man_rigged_biped` | `Idle_9` | 待机，并提供旧骨架绑定参考 |
| `Meshy_AI_business_man_rigged_biped` | `Wave_One_Hand` | 挥手 |
| `Meshy_AI_business_man_rigged_biped` | `Step_Forward_and_Push` | 前进推行 |
| `new/Meshy_AI_Business_Man_Rig_biped` | `Walking` | 新版骨架行走与运行时基础网格 |
| `new/Meshy_AI_Business_Man_Rig_biped` | `Running` | 新版骨架跑步 |
| `new/Meshy_AI_Business_Man_Rig_biped` | `Ladder_Climb_Loop` | 约 1.63 秒爬梯循环 |

2026-09-08 清理：5 个字节完全相同的副本、旧版走路和跑步、两个不带动画的静态模型、一个新版初始姿态模型已移入 Windows 回收站。没有永久清空回收站。新旧走路/跑步并非字节重复，旧版是因运行时采用新版骨架而被替代。

新旧骨架绑定不同，旧版待机、挥手和推行在运行时依据逆绑定矩阵适配新版骨架。爬梯循环用于上下行，上下梯入口与出口仍由导航路径及动画过渡协调。

生成资源：`npm run build:character`，然后 `npm run build`。生成的 `assets/character/feng-peng.glb`、`manifest.json`、`src/generated/character-pack.js` 和 `vendor/character-loader.js` 是项目运行与构建资源，不属于待删除副本。GLB 合并了 6 段动画、1 套网格和 1 张 8K 贴图，约 9 MB。

清理前的内容校验见 `docs/character-asset-audit.json`，被替代资源的清理记录见 `docs/character-unused-cleanup.json`。重新运行 `npm run audit:character` 会按当前文件重新生成审计。
