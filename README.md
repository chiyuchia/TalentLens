# TalentLens

<p align="center">
  <b>AI 赋能的智能简历分析平台</b>
</p>

<p align="center">
  上传 PDF 简历 · AI 结构化提取 · 岗位匹配评分 · 候选人管理
</p>

---

## 特性

- **批量 PDF 上传** — 支持拖拽上传和点击上传，单次最多 10 份 PDF 简历
- **SSE 流式解析** — 实时展示 PDF 文本提取和 AI 信息提取进度
- **AI 结构化提取** — 自动提取姓名、联系方式、教育背景、工作经历、技能标签、项目经历
- **岗位匹配评分** — 基于 JD 需求对候选人进行多维度评分（综合分、技能分、经验分、教育分），附带 AI 评语
- **候选人管理** — 表格/卡片视图切换、关键字搜索、技能筛选、评分排序、分页浏览
- **候选人对比** — 支持 2-3 人并排对比各维度评分和 AI 评语
- **状态流转** — 待筛选 → 初筛通过 → 面试中 → 已录用 / 已淘汰
- **主题切换** — 支持暗色/亮色主题，偏好持久化到 localStorage

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React 18 + TypeScript + Tailwind CSS |
| 状态管理 | TanStack Query (服务端状态) + Zustand (UI 状态) |
| 数据可视化 | Recharts |
| 后端 | Python + Flask + Gunicorn |
| ORM | Flask-SQLAlchemy |
| 数据库 | SQLite |
| PDF 解析 | PyMuPDF |
| AI 接口 | DeepSeek |
| 部署 | Docker Compose + Nginx |

## 项目结构

```text
TalentLens/
├── backend/              # Flask REST API
│   ├── app/
│   │   ├── blueprints/   # API 路由 (auth, uploads, candidates, jobs, scores)
│   │   ├── models/       # SQLAlchemy 数据模型
│   │   ├── services/     # 业务服务 (AI 服务、PDF 解析)
│   │   ├── utils/        # 工具函数
│   │   ├── config.py     # 应用配置
│   │   └── security.py   # 认证装饰器
│   ├── tests/            # 后端测试
│   ├── Dockerfile
│   ├── requirements.txt
│   └── wsgi.py           # 应用入口
├── frontend/             # React 前端
│   ├── src/
│   │   ├── app/          # 路由配置
│   │   ├── components/   # 共享组件
│   │   ├── pages/        # 页面组件
│   │   ├── lib/          # API 客户端、工具函数、状态管理
│   │   └── types/        # TypeScript 类型定义
│   ├── Dockerfile
│   └── package.json
├── deploy/               # Docker Compose 与 Nginx 配置
│   ├── docker-compose.yml
│   └── nginx/
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.12
- Docker & Docker Compose（部署用）

### 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 设置 APP_ACCESS_KEY 和 FLASK_SECRET_KEY

# 初始化数据库
flask --app wsgi init-db

# 启动开发服务器
flask --app wsgi run --host 0.0.0.0 --port 8000 --debug
```

后端默认使用 `AI_MODE=mock`，无需真实 AI Key 即可跑通完整流程。

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务默认运行在 `http://localhost:5173`，通过 Vite proxy 访问 `http://localhost:8000/api`。

### 登录

项目采用单密钥访问控制，无用户注册系统。首次访问需输入访问密钥登录。

本地开发可使用 `.env` 中的 `APP_ACCESS_KEY` 默认值；**生产环境必须替换为高强度随机密钥**。

## 环境变量

### 后端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FLASK_SECRET_KEY` | Cookie 签名密钥（生产环境必填） | `dev-secret-change-me` |
| `APP_ACCESS_KEY` | 访问密钥（生产环境必填） | — |
| `DATABASE_URL` | 数据库地址 | `sqlite:///talentlens.sqlite3` |
| `UPLOAD_DIR` | PDF 上传目录 | `instance/uploads` |
| `AI_MODE` | AI 模式：`mock` 或 `real` | `mock` |
| `AI_PROVIDER` | AI 提供商：`openai` / `moonshot` / `deepseek` | `openai` |
| `OPENAI_API_KEY` | OpenAI API Key | — |
| `OPENAI_BASE_URL` | OpenAI 兼容接口地址 | — |
| `OPENAI_MODEL` | OpenAI 模型名称 | — |
| `MOONSHOT_API_KEY` | Moonshot API Key | — |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | — |
| `FRONTEND_ORIGIN` | 前端域名（CORS 用） | — |
| `SESSION_COOKIE_SECURE` | Cookie 仅 HTTPS 传输 | `false` |

### 前端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | API 基础路径 | `/api` |

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 密钥登录 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/session` | 检查会话状态 |
| POST | `/api/uploads/resumes` | 批量上传 PDF |
| GET | `/api/uploads/:id/events` | SSE 流式解析进度 |
| GET | `/api/candidates` | 候选人列表（搜索/筛选/排序/分页） |
| GET | `/api/candidates/:id` | 候选人详情 |
| PATCH | `/api/candidates/:id/profile` | 更新候选人简历信息 |
| PATCH | `/api/candidates/:id/status` | 更新候选人状态 |
| POST | `/api/candidates/compare` | 2-3 人对比 |
| GET | `/api/candidates/:id/pdf` | 下载原始 PDF |
| GET | `/api/jobs` | JD 列表 |
| POST | `/api/jobs` | 创建 JD |
| PATCH | `/api/jobs/:id` | 更新 JD |
| DELETE | `/api/jobs/:id` | 删除 JD |
| GET | `/api/scores` | 评分结果列表 |
| POST | `/api/scores` | 对候选人执行评分 |
| GET | `/api/health` | 健康检查 |

## Docker 部署

### 1. 配置生产环境变量

```bash
cp deploy/.env.production.example deploy/.env.production
# 编辑 deploy/.env.production，设置以下必填项：
# APP_ACCESS_KEY、FLASK_SECRET_KEY、AI_MODE 等
```

### 2. 启动服务

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

Compose 默认将容器内 Web 服务绑定到宿主机 `127.0.0.1:8080`。

### 3. 配置宿主机 Nginx

参考 `deploy/nginx/nginx-host.conf.example` 配置反向代理。注意：

- 为 SSE 配置 `proxy_buffering off`
- 配置较长代理超时，避免 AI 提取期间连接被关闭
- 配置 `client_max_body_size 50m` 以支持批量上传
- 有域名时启用 HTTPS

### 4. 数据持久化

SQLite 数据库和上传的 PDF 文件通过 Docker volume 持久化，容器重启后数据不丢失。

## 常用命令

```bash
# 本地开发
make backend-dev        # 启动后端开发服务器
make frontend-dev       # 启动前端开发服务器

# 测试
make backend-test       # 运行后端测试

# Docker
make compose-up         # 构建并启动 Docker 服务
make compose-down       # 停止 Docker 服务
```

## 数据模型

```text
Candidate          候选人（上传批次、状态、PDF 路径、解析状态）
  └── ResumeProfile    简历结构化信息（姓名、联系方式、教育、工作、技能、项目）
  └── ScoreResult      岗位评分结果（综合分、各维度分、AI 评语）

JobDescription     岗位需求（标题、描述、必备技能、加分技能）
  └── ScoreResult      关联的候选人评分
```

## 开发规范

### 提交信息格式

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/)。

```text
<type>(<scope>): <subject>
```

常用 `type`：

| 类型 | 说明 |
|------|------|
| `feat` | 新增功能 |
| `fix` | 修复问题 |
| `docs` | 文档更新 |
| `style` | 不影响逻辑的格式或样式调整 |
| `refactor` | 重构 |
| `test` | 测试相关 |
| `chore` | 工程配置、依赖、脚本等维护工作 |
| `build` | 构建或部署相关 |
| `ci` | CI/CD 配置 |

示例：

```text
feat(auth): add access key login
fix(upload): handle invalid PDF files
docs(readme): add deployment instructions
```

## 许可证

[MIT](LICENSE)
