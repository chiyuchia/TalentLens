# TalentLens

TalentLens 是一个 AI 赋能的智能简历分析平台，用于上传 PDF 简历、解析候选人信息、通过 AI 进行结构化提取和岗位匹配评分，并提供候选人管理面板。

详细实施计划见 [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)。

## 项目结构

```text
backend/     Flask API、SQLite、PDF 解析、AI 适配
frontend/    Vite + React + TypeScript 前端
deploy/      Docker Compose 与 Nginx 配置
docs/        实施计划与项目文档
```

## 本地开发

### 后端

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
flask --app wsgi init-db
flask --app wsgi run --host 0.0.0.0 --port 8000 --debug
```

后端默认使用 `AI_MODE=mock`，无需真实 AI Key 即可跑通基础流程。

### 前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务默认运行在 `http://localhost:5173`，并通过 Vite proxy 访问 `http://localhost:8000/api`。

## 访问密钥

项目不做用户系统，只做单密钥登录。后端通过环境变量 `APP_ACCESS_KEY` 读取访问密钥，登录成功后写入 HttpOnly Cookie。

本地开发可使用 `backend/.env.example` 中的默认值；生产环境必须替换为高强度随机密钥。

## Docker 部署

```bash
cp deploy/.env.production.example deploy/.env.production
# 修改 deploy/.env.production 中的 APP_ACCESS_KEY 和 FLASK_SECRET_KEY
docker compose -f deploy/docker-compose.yml up -d --build
```

Compose 默认将容器内 Web 服务绑定到宿主机 `127.0.0.1:8080`，再由宿主机 Nginx 反向代理公网流量。宿主机 Nginx 示例见 `deploy/nginx/nginx-host.conf.example`。

## 常用命令

```bash
make backend-dev
make frontend-dev
make backend-test
make compose-up
make compose-down
```

## Git 提交规范

本项目使用 Conventional Commits。提交信息格式：

```text
<type>(<scope>): <subject>
```

常用 `type`：

- `feat`：新增功能
- `fix`：修复问题
- `docs`：文档更新
- `style`：不影响逻辑的格式或样式调整
- `refactor`：重构
- `test`：测试相关
- `chore`：工程配置、依赖、脚本等维护工作
- `build`：构建或部署相关
- `ci`：CI/CD 配置

示例：

```text
feat(auth): add access key login
fix(upload): handle invalid PDF files
docs(readme): add deployment instructions
chore(scaffold): initialize backend and frontend structure
```

## 当前阶段

当前已完成项目脚手架：后端应用工厂、认证蓝图、业务 API 占位、前端路由与页面壳、Docker Compose、Nginx 配置和基础运行说明。
