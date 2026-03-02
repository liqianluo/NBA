# CentOS 部署教程

> 适用于 CentOS 7 / 8 / 9，数据库使用 **MySQL 5.7+**。

---

## 第一步：安装 Node.js 22.x

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs
```

## 第二步：安装 MySQL

```bash
# 添加 MySQL 官方仓库
sudo rpm -Uvh https://dev.mysql.com/get/mysql80-community-release-el7-11.noarch.rpm

# 安装 MySQL
sudo yum install -y mysql-community-server

# 启动并设置开机自启
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取初始临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 修改 root 密码（用上面获取的临时密码登录）
mysql -u root -p
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPassword123!';
```

## 第三步：创建数据库用户

```sql
CREATE USER 'nba_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON nba_monitor.* TO 'nba_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> 数据库 `nba_monitor` 无需手动创建，程序启动时**自动创建数据库和所有数据表**。

## 第四步：安装 PM2

```bash
sudo npm install -g pm2
```

## 第五步：克隆项目

```bash
cd /opt
sudo git clone https://github.com/liqianluo/NBA.git
sudo chown -R $USER:$USER /opt/NBA
cd /opt/NBA
```

## 第六步：配置 .env

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

填入数据库信息：

```env
PORT=3001

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=nba_monitor
DB_USER=nba_user
DB_PASSWORD=your_strong_password
```

## 第七步：安装依赖 & 构建前端

```bash
cd /opt/NBA/backend && npm install
cd /opt/NBA/frontend && npm install && npm run build
```

## 第八步：启动服务

```bash
cd /opt/NBA/backend
pm2 start src/app.js --name "nba-monitor"
pm2 startup
# 执行上面命令输出的那行 sudo 命令
pm2 save
```

## 第九步：开放防火墙

```bash
sudo firewall-cmd --zone=public --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

访问 `http://<服务器IP>:3001` 即可使用。

---

## 常用维护命令

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 list` |
| 查看日志 | `pm2 logs nba-monitor` |
| 重启 | `pm2 restart nba-monitor` |
| 停止 | `pm2 stop nba-monitor` |
| 更新代码 | `cd /opt/NBA && git pull && cd frontend && npm run build && pm2 restart nba-monitor` |

---

## 可选：Nginx 反向代理

```bash
sudo yum install -y nginx
sudo systemctl start nginx && sudo systemctl enable nginx
sudo nano /etc/nginx/conf.d/nba-monitor.conf
```

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo nginx -t && sudo systemctl restart nginx
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --reload
```
