# CentOS 部署教程 - NBA 体育信息监控系统

本教程适用于 CentOS 7 / 8 / 9，支持 **SQLite（默认，零配置）** 和 **MySQL/MariaDB（生产推荐）** 两种数据库模式，通过 `.env` 文件统一管理配置。

---

## 一键部署命令（复制粘贴执行）

### 第一步：安装 Node.js 22.x

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
node -v && npm -v
```

### 第二步：安装 PM2

```bash
sudo npm install -g pm2
```

### 第三步：克隆项目

```bash
cd /opt
sudo git clone https://github.com/liqianluo/NBA.git
sudo chown -R $USER:$USER /opt/NBA
cd /opt/NBA
```

### 第四步：配置 .env 文件

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

`.env` 文件内容如下，按需修改：

```env
# 服务端口
PORT=3001

# 数据库类型：sqlite 或 mysql
DB_TYPE=sqlite

# ---- MySQL 配置（DB_TYPE=mysql 时填写）----
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nba_monitor
DB_USER=nba_user
DB_PASSWORD=your_strong_password
```

> **说明**：`DB_TYPE=sqlite` 时无需安装 MySQL，数据库文件自动创建在 `backend/data/nba.db`。

### 第五步：安装依赖 & 构建前端

```bash
cd /opt/NBA/backend && npm install
cd /opt/NBA/frontend && npm install && npm run build
```

### 第六步：启动应用

```bash
cd /opt/NBA/backend
pm2 start src/app.js --name "nba-monitor"
pm2 startup
# 执行上面命令输出的那行 sudo 命令
pm2 save
```

### 第七步：开放防火墙端口

```bash
sudo firewall-cmd --zone=public --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

访问 `http://<服务器IP>:3001` 即可使用。

---

## 使用 MySQL/MariaDB（可选）

如需使用 MySQL，在执行第四步时将 `.env` 中 `DB_TYPE` 改为 `mysql`，并先完成以下数据库准备：

```bash
# 安装 MariaDB
sudo yum install -y mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo mysql_secure_installation

# 创建数据库用户（数据库由程序自动创建）
sudo mysql -u root -p
```

```sql
CREATE USER 'nba_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON nba_monitor.* TO 'nba_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> **自动建库**：程序启动时会自动读取 `.env` 中的配置，自动创建数据库 `nba_monitor` 及所有数据表，无需手动执行 SQL 建表语句。

---

## 配置 Nginx 反向代理（可选）

```bash
sudo yum install -y nginx
sudo systemctl start nginx && sudo systemctl enable nginx
sudo nano /etc/nginx/conf.d/nba-monitor.conf
```

写入以下内容（将 `your_domain.com` 替换为您的域名）：

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --reload
```

---

## 常用维护命令

| 操作 | 命令 |
|------|------|
| 查看运行状态 | `pm2 list` |
| 查看实时日志 | `pm2 logs nba-monitor` |
| 重启应用 | `pm2 restart nba-monitor` |
| 停止应用 | `pm2 stop nba-monitor` |
| 更新代码后重启 | `cd /opt/NBA && git pull && cd frontend && npm run build && pm2 restart nba-monitor` |

---

## 目录结构说明

```
/opt/NBA/
├── backend/
│   ├── .env              ← 环境配置（不提交 Git）
│   ├── .env.example      ← 配置模板
│   ├── data/nba.db       ← SQLite 数据库（自动生成）
│   └── src/
│       └── models/
│           ├── database.js   ← 数据库初始化（自动建库建表）
│           └── dbAdapter.js  ← 统一适配层（兼容 SQLite/MySQL）
└── frontend/
    └── dist/             ← 前端构建产物（由后端静态托管）
```
