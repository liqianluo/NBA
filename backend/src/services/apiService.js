const axios = require('axios');
const { buildHeaders } = require('../utils/signature');
const db = require('../models/dbAdapter');

/**
 * 获取当前 API 配置
 */
async function getConfig() {
  const config = await db.get('SELECT * FROM api_config ORDER BY id DESC LIMIT 1');
  if (!config) throw new Error('API 配置未设置，请先配置 API 信息');
  return config;
}

/**
 * 发起 API 请求
 */
async function request(path, params = {}) {
  const config = await getConfig();
  const baseUrl = config.base_url.replace(/\/$/, '');
  const headers = buildHeaders(config.api_key, config.private_key, params);

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;

  const response = await axios.get(url, {
    headers,
    timeout: 20000,
    maxContentLength: 50 * 1024 * 1024,  // 50MB
    maxBodyLength: 50 * 1024 * 1024       // 50MB
  });

  return response.data;
}

/**
 * Ping 测试 - 查询调用量接口
 */
async function ping() {
  const config = await getConfig();
  const baseUrl = config.base_url.replace(/\/$/, '');
  const headers = buildHeaders(config.api_key, config.private_key, {});
  const url = `${baseUrl}/firo/basic/usage/remaining`;

  const response = await axios.get(url, {
    headers,
    timeout: 10000
  });
  return response.data;
}

/**
 * 查询 API 剩余调用量
 */
async function getUsageRemaining() {
  return await ping();
}

/**
 * 查询篮球赛程信息（竞蓝，仅未开赛）
 * 注意：该接口不支持 date 参数，传参会导致签名验证失败(401)
 * 只返回今日未开赛赛程
 */
async function getBasketballList() {
  return await request('/firo/basketball/list', {});
}

/**
 * 查询篮球赛程信息（全部赛事，含已开赛/已结束）
 * Bug1 修复：用于展示历史日期赛事列表
 */
async function getBasketballAllList(date) {
  const params = {};
  if (date) params.date = date;
  return await request('/firo/basketball/all-list', params);
}

/**
 * 查询篮球文字战况直播
 */
async function getBasketballLive(date) {
  const params = {};
  if (date) params.date = date;
  return await request('/firo/bb-text/live', params);
}

/**
 * 查询篮球赛事综合信息（含历史交锋、积分榜等）
 */
async function getBasketballInfo(matchId) {
  return await request('/firo/basketball/info', { matchId });
}

/**
 * 查询篮球赔率信息
 */
async function getBasketballOdds(matchId) {
  return await request('/firo/basketball/odds', { matchId });
}

/**
 * 查询篮球赛后开奖信息
 */
async function getBasketballMatchResults(startDate, endDate) {
  return await request('/firo/bb-text/match-results', { startDate, endDate });
}

module.exports = {
  getConfig,
  ping,
  getUsageRemaining,
  getBasketballList,
  getBasketballAllList,
  getBasketballLive,
  getBasketballInfo,
  getBasketballOdds,
  getBasketballMatchResults
};
