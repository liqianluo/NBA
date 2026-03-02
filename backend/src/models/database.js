require('dotenv').config();
const path = require('path');
const fs = require('fs');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// ─── SQLite 模式 ───────────────────────────────────────────────
function initSQLite() {
  const Database = require('better-sqlite3');
  const DB_DIR = path.join(__dirname, '../../data');
  const DB_PATH = path.join(DB_DIR, 'nba.db');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables_sqlite(db);
  console.log(`[DB] SQLite 初始化成功 → ${DB_PATH}`);
  return db;
}

function createTables_sqlite(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS monitor_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT NOT NULL,
      match_name TEXT NOT NULL,
      home_team TEXT,
      away_team TEXT,
      league_name TEXT,
      match_date TEXT,
      match_time TEXT,
      interval_minutes INTEGER DEFAULT 5,
      status TEXT DEFAULT 'running',
      match_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      stopped_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS monitor_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      match_id TEXT NOT NULL,
      record_type TEXT DEFAULT 'live',
      raw_data TEXT,
      match_status TEXT,
      match_status_name TEXT,
      home_score TEXT,
      away_score TEXT,
      sections_data TEXT,
      team_stats TEXT,
      player_stats TEXT,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES monitor_tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      query_date TEXT NOT NULL,
      raw_data TEXT,
      match_count INTEGER DEFAULT 0,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ─── MySQL 模式 ────────────────────────────────────────────────
async function initMySQL() {
  const mysql = require('mysql2/promise');

  const host     = process.env.DB_HOST     || '127.0.0.1';
  const port     = parseInt(process.env.DB_PORT || '3306');
  const dbName   = process.env.DB_NAME     || 'nba_monitor';
  const user     = process.env.DB_USER     || 'root';
  const password = process.env.DB_PASSWORD || '';

  // 第一步：不指定数据库，先连接 MySQL 服务，自动创建数据库
  const rootConn = await mysql.createConnection({ host, port, user, password });
  await rootConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();
  console.log(`[DB] 数据库 \`${dbName}\` 已确认存在`);

  // 第二步：创建连接池（指定数据库）
  const pool = mysql.createPool({
    host, port, user, password,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4'
  });

  // 第三步：创建数据表
  await createTables_mysql(pool);
  console.log(`[DB] MySQL 初始化成功 → ${user}@${host}:${port}/${dbName}`);
  return pool;
}

async function createTables_mysql(pool) {
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
}

// ─── 统一导出（兼容层）────────────────────────────────────────
// 无论 SQLite 还是 MySQL，对外暴露统一的 db 对象和 dbReady Promise
let db = null;
let dbType = DB_TYPE;

// dbReady 在 app.js 中 await，确保数据库就绪后再启动 HTTP 服务
const dbReady = (async () => {
  if (DB_TYPE === 'mysql') {
    db = await initMySQL();
  } else {
    db = initSQLite();
  }
  return db;
})();

module.exports = {
  get db() { return db; },
  dbReady,
  dbType,
};
