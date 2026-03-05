# ─── 阶段一：构建前端 ────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ─── 阶段二：生产镜像 ────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# 安装后端依赖
COPY backend/package*.json ./
RUN npm ci --omit=dev

# 复制后端源码
COPY backend/ ./

# 复制前端构建产物到后端静态目录
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# 启动命令
CMD ["node", "src/app.js"]
