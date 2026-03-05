require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_HOST     = process.env.DB_HOST     || '127.0.0.1';
const DB_PORT     = parseInt(process.env.DB_PORT || '3306');
const DB_NAME     = process.env.DB_NAME     || 'nba_monitor';
const DB_USER     = process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

let pool = null;

async function initDatabase() {
  // 第一步：不指定数据库连接，自动创建数据库
  const conn = await mysql.createConnection({
    host: DB_HOST, port: DB_PORT,
    user: DB_USER, password: DB_PASSWORD,
    connectTimeout: 10000
  });
  await conn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.end();

  // 第二步：创建连接池
  pool = mysql.createPool({
    host: DB_HOST, port: DB_PORT,
    user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,          // 增加连接池大小
    queueLimit: 50,               // 限制等待队列，避免无限积压
    connectTimeout: 10000,        // 连接超时 10s
    charset: 'utf8mb4'
  });

  // 第三步：建表
  const sqls = [
    `CREATE TABLE IF NOT EXISTS api_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      base_url VARCHAR(255) NOT NULL,
      api_key VARCHAR(255) NOT NULL,
      private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS monitor_tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      match_id VARCHAR(64) NOT NULL,
      match_name VARCHAR(255) NOT NULL,
      home_team VARCHAR(128),
      away_team VARCHAR(128),
      league_name VARCHAR(128),
      match_date VARCHAR(20),
      match_time VARCHAR(20),
      interval_minutes INT DEFAULT 5,
      status VARCHAR(20) DEFAULT 'running',
      match_status VARCHAR(64),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      stopped_at DATETIME
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS monitor_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      match_id VARCHAR(64) NOT NULL,
      record_type VARCHAR(20) DEFAULT 'live',
      raw_data LONGTEXT,
      match_status VARCHAR(64),
      match_status_name VARCHAR(64),
      home_score VARCHAR(20),
      away_score VARCHAR(20),
      sections_data TEXT,
      team_stats LONGTEXT,
      player_stats LONGTEXT,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES monitor_tasks(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS schedule_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      task_id INT,
      query_date VARCHAR(20) NOT NULL,
      raw_data LONGTEXT,
      match_count INT DEFAULT 0,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  ];

  for (const sql of sqls) {
    await pool.execute(sql);
  }

  console.log(`[DB] MySQL 连接成功 → ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);
  return pool;
}

// dbReady：在 app.js 中 await，确保数据库就绪后再启动 HTTP 服务
const dbReady = initDatabase().catch(err => {
  console.error('[DB] 数据库初始化失败:', err.message);
  process.exit(1);
});

const getPool = () => pool;

module.exports = { dbReady, getPool };
