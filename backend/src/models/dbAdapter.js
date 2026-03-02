/**
 * 数据库适配层
 * 统一封装 SQLite (better-sqlite3) 和 MySQL (mysql2/promise) 的操作差异
 * 对外暴露统一的 query / get / run / all 接口
 */

const { db, dbReady, dbType } = require('./database');

/**
 * 执行查询，返回多行
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>}
 */
async function all(sql, params = []) {
  await dbReady;
  if (dbType === 'mysql') {
    const [rows] = await db.execute(sql, params);
    return rows;
  } else {
    return db.prepare(sql).all(...params);
  }
}

/**
 * 执行查询，返回单行
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Object|undefined>}
 */
async function get(sql, params = []) {
  await dbReady;
  if (dbType === 'mysql') {
    const [rows] = await db.execute(sql, params);
    return rows[0];
  } else {
    return db.prepare(sql).get(...params);
  }
}

/**
 * 执行写操作（INSERT / UPDATE / DELETE）
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<{lastInsertId: number, changes: number}>}
 */
async function run(sql, params = []) {
  await dbReady;
  if (dbType === 'mysql') {
    const [result] = await db.execute(sql, params);
    return {
      lastInsertId: result.insertId,
      changes: result.affectedRows
    };
  } else {
    const stmt = db.prepare(sql).run(...params);
    return {
      lastInsertId: stmt.lastInsertRowid,
      changes: stmt.changes
    };
  }
}

module.exports = { all, get, run };
