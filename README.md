# Quire · 书帖

> 本地优先的 Markdown 笔记应用。数据只留在你自己的电脑里（一个 SQLite 文件），
> 不联网、不注册、不追云。用 Tauri v2 + React + Rust 写成，安装包只有几 MB。

**已经能用**：笔记增删改查 · 标题搜索 · 编辑 / 分屏 / 预览三视图 · 600ms 自动保存 ·
`Ctrl+S` / `Ctrl+N` · 9 个 Markdown 工具栏按钮 · 自绘无边框顶栏 · 跟随系统的亮暗主题

> 名字取自「书帖」（quire）——一叠对折的纸，叠起来就是一册笔记本。
> 这个项目同时是一份 **Tauri v2 入门学习笔记**：架构、数据流、每一步为什么这么做，都写在下面。

---

## 快速开始

```powershell
# 前置条件（只需一次）：
#   1. Node.js 18+        （已有）
#   2. Rust 工具链         winget install Rustlang.Rustup
#   3. VS C++ 生成工具      winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.Visual
Studio.Workload.VCTools --includeRecommended"

cd quire
npm install               # 安装前端依赖
node scripts/make-icon.mjs && npx tauri icon src-tauri/icons/app-icon.png   # 生成应用图标
npm run tauri dev         # 开发模式（第一次要编译 Rust，约 2-5 分钟）
npm run tauri build       # 打出 Windows 安装包 → src-tauri/target/release/bundle/
```

> 国内网络下官方 crates.io 索引可能慢到不可用（实测 ~5KB/s）。项目里已经带了
> `src-tauri/.cargo/config.toml` 指向 rsproxy 镜像，克隆后无需额外配置。

---

## 一、用了什么技术栈（各管什么）

| 层 | 技术 | 职责 |
|---|---|---|
| 界面 | **React 18 + TypeScript** | 所有 UI、状态流转、自动保存逻辑 |
| 构建 | **Vite 5** | 开发热更新、打包出静态文件 |
| 胶水 | **Tauri v2** | 把网页装进系统窗口，架起前后端 IPC 通道，打包安装程序 |
| 后端 | **Rust** | 增删改查命令、文件/系统能力（真正的“桌面”能力都在这） |
| 存储 | **SQLite**（rusqlite） | 单文件数据库，零配置，笔记应用的标准答案 |
| 渲染 | **react-markdown + remark-gfm** | Markdown → HTML 实时预览（表格、任务列表等） |

> 记住这个分工：**前端管“长什么样、怎么交互”，Rust 管“数据和系统”**。
> 前端是 WebView 里的网页，它自己碰不到文件系统——必须通过 IPC 问 Rust 要。

## 二、架构总览

```
┌─────────────────────────────────────────────────────┐
│  WebView（系统自带浏览器内核，加载 Vite 打包的网页）      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Sidebar  │  │ Editor   │  │ Preview           │  │
│  └────┬─────┘  └────┬─────┘  └───────────────────┘  │
│       └──── App.tsx（状态：notes / active / 保存状态）│
│                  │ invoke('命令名', {参数})           │
├──────────────────┼──────────────────────────────────┤
│         Tauri IPC（JSON 序列化，跨进程）               │
├──────────────────┼──────────────────────────────────┤
│  Rust 侧         ▼                                  │
│  commands.rs ── #[tauri::command] 五个函数            │
│  db.rs ──────── Mutex<Connection> + notes 表          │
│  notes.db（%APPDATA%\com.alan.markdown-notes\）      │
└─────────────────────────────────────────────────────┘
```

## 三、目录结构（每个文件是干嘛的）

```
quire/
├── package.json              # 前端依赖 + 脚本（npm run tauri 走这里）
├── index.html                # 网页入口，WebView 加载的第一个页面
├── vite.config.ts            # Vite 配置（固定 1420 端口给 Tauri 连）
├── src/                      # ↓ 前端（TypeScript / React）
│   ├── main.tsx              # React 挂载入口
│   ├── App.tsx               # 核心：状态管理、自动保存、快捷键、主题
│   ├── api.ts                # invoke 封装层——前端调用 Rust 的唯一通道
│   ├── types.ts              # 前后端共享的数据形状（对应 Rust 的 struct）
│   ├── theme.ts              # 主题模式（跟随系统/浅色/深色）读写
│   ├── styles.css            # 浅色、深色两套 CSS 变量 + 全部样式
│   └── components/
│       ├── TitleBar.tsx      # 自绘无边框顶栏：拖拽区、窗口按钮、主题按钮
│       ├── Sidebar.tsx       # 笔记列表、搜索、删除确认
│       ├── Editor.tsx        # 标题、Markdown 工具栏、textarea
│       └── Preview.tsx       # react-markdown 实时渲染
├── scripts/make-icon.mjs     # 零依赖 PNG 图标生成脚本
└── src-tauri/                # ↓ 后端（Rust）
    ├── tauri.conf.json       # 窗口尺寸、打包配置、前后端对接地址
    ├── capabilities/         # 权限清单（Tauri v2 最小授权模型）
    ├── Cargo.toml            # Rust 依赖（等价于 npm 之于前端）
    └── src/
        ├── main.rs           # 程序入口：装配插件、状态、命令
        ├── db.rs             # 打开 SQLite、建表、共享状态定义
        └── commands.rs       # 5 个命令 = 5 个数据库操作（前端能调的全部）
```

## 四、一次自动保存的完整数据流（桌面开发的核心心智模型）

1. 你在 textarea 里敲一个字 → React `onChange` 触发
2. `Editor` 调 `onChange({content})` → `App.patchActive` 更新 `active` state
3. App 的副作用检测到 `content` 变了 → 标记 `dirty`，设 600ms 定时器（防抖）
4. 600ms 内没再输入 → 调 `api.updateNote(id, title, content)`
5. `invoke('update_note', {...})` → 参数序列化成 JSON → **穿过 IPC** → Rust
6. Rust `update_note` 命令拿锁、执行 `UPDATE ... RETURNING ...`，SQLite 写盘
7. 结果序列化回 JSON → IPC 返回 → 前端 `setActive` + 更新列表时间 → 状态显示“已保存”

**换一种说法**：Tauri 应用 = “一个网页 + 一个 Rust 微服务，中间焊死了一条本地 RPC 通道”。
你以前用 `fetch('/api/xxx')` 调后端，现在换成 `invoke('xxx')` 调 Rust，其余心智模型完全一样。

## 五、数据存在哪？

```
%APPDATA%\com.alan.markdown-notes\notes.db
```
直接用任意 SQLite 工具（如 DB Browser for SQLite）打开就能看到 `notes` 表。
删掉这个文件 = 清空所有笔记（可以拿来做恢复实验）。

> 目录名来自 `tauri.conf.json` 的 `identifier`。为了不搬动已有数据，改项目名时刻意没有动它。

## 六、学习路线（建议按顺序改）

1. **改窗口**：`src-tauri/tauri.conf.json` 里的 width/height/title，改完 dev 模式看效果
2. **改状态**：在 `App.tsx` 把防抖 600ms 调成 2000，观察“未保存…”的变化
3. **加字段**：给笔记加“收藏”布尔列 —— 走一遍完整的三端修改：
   SQL 建表（db.rs）→ struct 和命令（commands.rs）→ 类型（types.ts）→ UI
4. **加功能**：
   - 删除改成回收站：删除时只标记 `deleted_at`，列表里过滤掉
   - Markdown 导出为 `.md` 文件（用 `@tauri-apps/plugin-fs`）
   - 标签 / 文件夹分类
   - 全局全文搜索（SQLite FTS5 扩展）
5. **看文档**：[tauri.app/docs](https://tauri.app/zh-cn/start/) → plugin 列表
   （dialog 文件对话框、fs、store、tray-icon 系统托盘……）

## 七、常见问题

- **`cargo` 不是命令**：Rust 没装好或终端没重启，跑 `rustup --version` 验证
- **链接错误 `link.exe not found`**：VS C++ Build Tools 没装全，重跑第 3 条安装命令
- **白屏**：看 `npm run tauri dev` 的控制台报错，一般是 IPC 命令名对不上
- **端口 1420 被占用**：改 `vite.config.ts` 和 `tauri.conf.json` 的 devUrl（两处要一致）
- **首次编译很慢**：Rust 第一次要编译几百个依赖，之后增量编译只要几秒
- **自绘顶栏拖不动窗口**：检查 `capabilities/default.json` 里有没有 `core:window:allow-start-dragging`
