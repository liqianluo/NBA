# CentOS 部署教程 - NBA 体育信息监控系统

本教程将指导您如何在 CentOS 7/8/9 系统上完整部署 NBA 体育信息监控系统。

---

## 1. 环境准备

在开始部署之前，请确保您的 CentOS 服务器已连接到互联网，并拥有 `sudo` 权限。

### 1.1 安装 Git

使用 `yum` 包管理器安装 Git。

```bash
sudo yum install -y git
```

### 1.2 安装 Node.js

推荐安装 Node.js 22.x LTS 版本。我们将使用 NodeSource 官方仓库进行安装。

```bash
# 添加 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -

# 安装 Node.js
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

### 1.3 安装 MariaDB (MySQL)

CentOS 默认使用 MariaDB 作为 MySQL 的替代品，它与 MySQL 完全兼容。

```bash
# 安装 MariaDB
sudo yum install -y mariadb-server

# 启动并设置开机自启
sudo systemctl start mariadb
sudo systemctl enable mariadb

# 运行安全安装向导（重要）
sudo mysql_secure_installation
```

> **安全提示**：在 `mysql_secure_installation` 向导中，请务必设置 **root 密码**，并移除匿名用户、禁止远程 root 登录、移除测试数据库。

### 1.4 安装 PM2 进程管理器

PM2 可以让您的 Node.js 应用在后台持续运行，并在服务器重启后自动恢复。

```bash
sudo npm install -g pm2
```

---

## 2. 部署应用

### 2.1 克隆代码仓库

从 GitHub 克隆项目到您的服务器。

```bash
cd /opt  # 推荐将应用部署在 /opt 目录
git clone https://github.com/liqianluo/NBA.git
cd NBA
```

### 2.2 创建数据库

登录 MariaDB 并为应用创建专用的数据库和用户。

```bash
# 使用 root 账户登录
sudo mysql -u root -p
```

在 MariaDB 提示符下，执行以下 SQL 命令：

```sql
-- 创建数据库
CREATE DATABASE nba_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户并授权（请将 'your_strong_password' 替换为强密码）
CREATE USER 'nba_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON nba_monitor.* TO 'nba_user'@'localhost';

-- 刷新权限并退出
FLUSH PRIVILEGES;
EXIT;
```

### 2.3 修改数据库配置

项目默认使用 SQLite。您需要修改后端代码以连接到 MariaDB。

编辑数据库配置文件：

```bash
nano backend/src/models/database.js
```

将文件内容**完全替换**为以下代码，并填入您上一步设置的数据库信息：

```javascript
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: '127.0.0.1',
    port: 3306,
    user: 'nba_user', // 替换为您的数据库用户名
    password: 'your_strong_password', // 替换为您的数据库密码
    database: 'nba_monitor' // 替换为您的数据库名
  },
  pool: { min: 2, max: 10 }
});

async function initializeDatabase() {
  try {
    // 检查数据库连接
    await knex.raw('SELECT 1');

    // 检查并创建 api_config 表
    if (!(await knex.schema.hasTable('api_config'))) {
      await knex.schema.createTable('api_config', table => {
        table.string('id').primary();
        table.string('base_url', 255);
        table.string('api_key', 255);
        table.text('private_key');
        table.string('status', 50);
      });
    }

    // 检查并创建 monitor_tasks 表
    if (!(await knex.schema.hasTable('monitor_tasks'))) {
      await knex.schema.createTable('monitor_tasks', table => {
        table.increments('id').primary();
        table.string('match_id').notNullable();
        table.string('match_name').notNullable();
        table.string('match_date');
        table.string('match_time');
        table.string('league_name');
        table.string('home_team');
        table.string('away_team');
        table.integer('interval_minutes').notNullable();
        table.string('status', 50).defaultTo('running'); // running, stopped, finished
        table.string('match_status');
        table.timestamp('created_at').defaultTo(knex.fn.now());
      });
    }

    // 检查并创建 monitor_records 表
    if (!(await knex.schema.hasTable('monitor_records'))) {
      await knex.schema.createTable('monitor_records', table => {
        table.increments('id').primary();
        table.integer('task_id').unsigned().references('id').inTable('monitor_tasks').onDelete('CASCADE');
        table.string('record_type').defaultTo('live'); // live, error
        table.timestamp('queried_at').defaultTo(knex.fn.now());
        table.string('match_status_name');
        table.string('home_score');
        table.string('away_score');
        table.text('sections_data'); // JSON string for section scores
        table.text('player_stats'); // JSON string for player stats
        table.text('team_stats'); // JSON string for team stats
        table.text('error_message');
      });
    }

    console.log('Database connected and schema initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

module.exports = { knex, initializeDatabase };
```

### 2.4 安装依赖并构建项目

```bash
# 安装后端和前端所有依赖
npm run install:all

# 安装 mysql2 驱动
cd backend
npm install mysql2
cd ..

# 构建前端静态文件
npm run build
```

---

## 3. 启动与维护

### 3.1 使用 PM2 启动应用

```bash
# 进入后端目录
cd backend

# 使用 PM2 启动应用
pm2 start src/app.js --name "nba-monitor"
```

### 3.2 设置开机自启

让 PM2 在服务器重启后自动启动您的应用。

```bash
pm2 startup
# 根据提示执行输出的命令，类似：sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u <user> --hp /home/<user>
pm2 save
```

### 3.3 配置防火墙

开放应用所需的端口（默认为 3001）。

```bash
sudo firewall-cmd --zone=public --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

### 3.4 访问应用

现在，您可以通过 `http://<您的服务器IP>:3001` 访问应用了。

首次访问，请务必在 **API 配置** 页面填入您的 FiroApi Key 和 Private Key。

### 3.5 常用 PM2 命令

| 命令 | 说明 |
|---|---|
| `pm2 list` | 查看所有应用状态 |
| `pm2 logs nba-monitor` | 查看 `nba-monitor` 应用的日志 |
| `pm2 restart nba-monitor` | 重启 `nba-monitor` 应用 |
| `pm2 stop nba-monitor` | 停止 `nba-monitor` 应用 |
| `pm2 delete nba-monitor` | 删除 `nba-monitor` 应用 |

---

## 4. (可选) 配置 Nginx 反向代理

使用 Nginx 可以让您通过域名访问应用，并方便地配置 HTTPS。

### 4.1 安装 Nginx

```bash
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.2 配置 Nginx

创建一个新的 Nginx 配置文件。

```bash
sudo nano /etc/nginx/conf.d/nba-monitor.conf
```

将以下内容粘贴进去，并将 `your_domain.com` 替换为您的域名。

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

### 4.3 重启 Nginx 并更新防火墙

```bash
# 测试 Nginx 配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 防火墙开放 HTTP 和 HTTPS 端口
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-service=https --permanent
sudo firewall-cmd --reload
```

现在您可以通过 `http://your_domain.com` 访问应用了。
