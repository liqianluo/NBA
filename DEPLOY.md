# NBA Monitor 永久部署指南

本文档提供两种部署方式：**Docker 一键部署**（推荐）和**手动部署**。

---

## 方式一：Docker 一键部署（推荐）

### 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Linux（Ubuntu 20.04+ / CentOS 7+）|
| CPU | 1 核以上 |
| 内存 | 1 GB 以上 |
| 磁盘 | 10 GB 以上 |
| 软件 | Docker 20.10+、Docker Compose v2+ |

### 第一步：安装 Docker

**Ubuntu：**
```bash
curl -fsSL https://get.docker.com | bash
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER && newgrp docker
```

**CentOS：**
```bash
curl -fsSL https://get.docker.com | bash
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker $USER && newgrp docker
```

### 第二步：克隆项目

```bash
git clone https://github.com/liqianluo/NBA.git
cd NBA
```

### 第三步：配置环境变量

```bash
cp .env.docker .env
# 编辑 .env，修改数据库密码（强烈建议修改）
nano .env
```

`.env` 内容示例：
```env
APP_PORT=3001
MYSQL_ROOT_PASSWORD=你的强密码
MYSQL_PASSWORD=你的强密码
```

### 第四步：一键启动

```bash
docker compose up -d --build
```

首次启动约需 3-5 分钟（下载镜像 + 构建前端）。

### 第五步：验证启动

```bash
# 查看容器状态
docker compose ps

# 查看应用日志
docker compose logs -f app
```

看到 `NBA Monitor Server running on port 3001` 即表示启动成功。

### 访问

浏览器打开 `http://<服务器IP>:3001`

---

## 方式二：Nginx + HTTPS（绑定域名）

在方式一基础上，配置 Nginx 反向代理并申请 SSL 证书。

### 安装 Nginx 和 Certbot

```bash
# Ubuntu
sudo apt install -y nginx certbot python3-certbot-nginx

# CentOS
sudo yum install -y nginx certbot python3-certbot-nginx
```

### 配置 Nginx

```bash
sudo nano /etc/nginx/conf.d/nba-monitor.conf
```

填入以下内容（将 `your-domain.com` 替换为你的域名）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
```

### 申请 SSL 证书（HTTPS）

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot 会自动修改 Nginx 配置，开启 HTTPS 并设置自动续期。

---

## 方式三：手动部署（无 Docker）

适用于已有 MySQL 的服务器。

### 安装依赖

```bash
# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 安装 PM2（进程守护）
sudo npm install -g pm2
```

### 克隆并配置

```bash
git clone https://github.com/liqianluo/NBA.git /opt/NBA
cd /opt/NBA

# 配置后端环境变量
cp backend/.env.example backend/.env
nano backend/.env
```

`.env` 内容：
```env
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nba_monitor
DB_USER=nba_user
DB_PASSWORD=你的数据库密码
```

### 安装依赖 & 构建

```bash
cd /opt/NBA/backend && npm install
cd /opt/NBA/frontend && npm install && npm run build
```

### 启动服务

```bash
cd /opt/NBA/backend
pm2 start src/app.js --name "nba-monitor"
pm2 startup    # 执行输出的 sudo 命令以开机自启
pm2 save
```

---

## 常用维护命令

### Docker 部署

| 操作 | 命令 |
|------|------|
| 查看状态 | `docker compose ps` |
| 查看日志 | `docker compose logs -f app` |
| 重启应用 | `docker compose restart app` |
| 停止所有 | `docker compose down` |
| 更新代码 | `git pull && docker compose up -d --build app` |
| 备份数据库 | `docker compose exec db mysqldump -u root -p nba_monitor > backup.sql` |
| 恢复数据库 | `docker compose exec -T db mysql -u root -p nba_monitor < backup.sql` |

### PM2 部署

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 list` |
| 查看日志 | `pm2 logs nba-monitor` |
| 重启 | `pm2 restart nba-monitor` |
| 更新代码 | `cd /opt/NBA && git pull && cd frontend && npm run build && pm2 restart nba-monitor` |

---

## 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp   # 如果直接暴露端口（不用 Nginx 时）

# CentOS (firewalld)
sudo firewall-cmd --zone=public --add-port=3001/tcp --permanent
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-service=https --permanent
sudo firewall-cmd --reload
```

---

## 推荐云服务器

| 平台 | 最低配置 | 参考价格 |
|------|---------|---------|
| 阿里云 ECS | 1核2G | ~60元/月 |
| 腾讯云 CVM | 1核2G | ~60元/月 |
| 华为云 ECS | 1核2G | ~60元/月 |
| Vultr | 1核1G | ~$6/月 |
| DigitalOcean | 1核1G | ~$6/月 |

> **提示**：如需绑定域名，还需在域名服务商处将域名 A 记录指向服务器 IP。
