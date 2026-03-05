const { dbReady, getPool } = require('./database');

// 带超时保护的数据库执行包装器，防止连接池耗尽时永久挂起
function withTimeout(promise, ms, label) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`DB timeout (${ms}ms): ${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

async function all(sql, params = []) {
  await withTimeout(dbReady, 10000, 'dbReady');
  const [rows] = await withTimeout(getPool().execute(sql, params), 10000, sql.slice(0, 60));
  return rows;
}

async function get(sql, params = []) {
  await withTimeout(dbReady, 10000, 'dbReady');
  const [rows] = await withTimeout(getPool().execute(sql, params), 10000, sql.slice(0, 60));
  return rows[0];
}

async function run(sql, params = []) {
  await withTimeout(dbReady, 10000, 'dbReady');
  const [result] = await withTimeout(getPool().execute(sql, params), 10000, sql.slice(0, 60));
  return { lastInsertId: result.insertId, changes: result.affectedRows };
}

module.exports = { all, get, run };
