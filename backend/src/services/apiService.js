const axios = require('axios');
const { buildHeaders } = require('../utils/signature');
const db = require('../models/database');

/**
 * 获取当前 API 配置
 */
function getConfig() {
  const config = db.prepare('SELECT * FROM api_config ORDER BY id DESC LIMIT 1').get();
  if (!config) throw new Error('API 配置未设置，请先配置 API 信息');
  return config;
}

/**
 * 发起 API 请求
 */
async function request(path, params = {}) {
  const config = getConfig();
  const baseUrl = config.base_url.replace(/\/$/, '');
  const headers = buildHeaders(config.api_key, config.private_key, params);

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;

  const response = await axios.get(url, {
    headers,
    timeout: 15000
  });

  return response.data;
}

/**
 * Ping 测试 - 查询调用量接口
 */
async function ping() {
  const config = getConfig();
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
 * 查询篮球赛程信息（竞蓝）
 */
async function getBasketballList(date) {
  const params = {};
  if (date) params.date = date;
  return await request('/firo/basketball/list', params);
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
  getBasketballList,
  getBasketballLive,
  getBasketballInfo,
  getBasketballOdds,
  getBasketballMatchResults
};
