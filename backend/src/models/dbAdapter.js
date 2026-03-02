const { dbReady, getPool } = require('./database');

async function all(sql, params = []) {
  await dbReady;
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function get(sql, params = []) {
  await dbReady;
  const [rows] = await getPool().execute(sql, params);
  return rows[0];
}

async function run(sql, params = []) {
  await dbReady;
  const [result] = await getPool().execute(sql, params);
  return { lastInsertId: result.insertId, changes: result.affectedRows };
}

module.exports = { all, get, run };
