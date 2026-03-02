const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'nba.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// 启用 WAL 模式提高性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 初始化数据库表
function initDatabase() {
  // API 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      base_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 监控任务表
  db.exec(`
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
    )
  `);

  // 监控记录表（每次查询的历史记录）
  db.exec(`
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
    )
  `);

  // 赛程查询记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      query_date TEXT NOT NULL,
      raw_data TEXT,
      match_count INTEGER DEFAULT 0,
      queried_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

initDatabase();

module.exports = db;
