const express = require('express');
const router = express.Router();
const apiService = require('../services/apiService');
const db = require('../models/dbAdapter');

// 获取今日直播赛事列表（文字战况直播）
router.get('/live', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];
    const result = await apiService.getBasketballLive(queryDate);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取篮球赛程列表（竞蓝赛程）
router.get('/schedule', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];
    const result = await apiService.getBasketballList(queryDate);

    // 保存查询记录
    try {
      const matchCount = Array.isArray(result.data) ? result.data.length : 0;
      await db.run(
        'INSERT INTO schedule_records (query_date, raw_data, match_count) VALUES (?, ?, ?)',
        [queryDate, JSON.stringify(result), matchCount]
      );
    } catch (dbError) {
      console.error('Failed to save schedule record:', dbError.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取赛事综合信息（历史交锋、积分榜等）
router.get('/info/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await apiService.getBasketballInfo(matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取赛事赔率信息
router.get('/odds/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await apiService.getBasketballOdds(matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取指定赛事球员统计数据（直接从 live 接口按日期拉取）
router.get('/player-stats/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: '请提供比赛日期（date）' });
    }
    console.log(`[player-stats] 开始请求 matchId=${matchId} date=${date}`);
    const t0 = Date.now();
    const liveData = await apiService.getBasketballLive(date);
    console.log(`[player-stats] live接口耗时 ${Date.now() - t0}ms`);
    if (!liveData || !liveData.data || !liveData.data.matches) {
      return res.json({ success: true, data: null, message: '未找到该日期的比赛数据' });
    }
    const match = liveData.data.matches.find(m => String(m.matchId) === String(matchId));
    if (!match) {
      return res.json({ success: true, data: null, message: '未找到该赛事，请确认日期是否正确' });
    }
    // 解析 playerStats
    let playerStats = match.playerStats || null;
    if (playerStats) {
      if (typeof playerStats.awayPlayerStats === 'string') {
        try { playerStats.awayPlayerStats = JSON.parse(playerStats.awayPlayerStats); } catch (e) {}
      }
      if (typeof playerStats.homePlayerStats === 'string') {
        try { playerStats.homePlayerStats = JSON.parse(playerStats.homePlayerStats); } catch (e) {}
      }
    }
    // 解析 teamStats
    let teamStats = match.teamStats || null;
    if (teamStats && typeof teamStats.stats === 'string') {
      try { teamStats.stats = JSON.parse(teamStats.stats); } catch (e) {}
    }
    // 解析比分信息
    let homeScore = '', awayScore = '', sections = [], matchStatusName = '';
    if (match.matchInfo) {
      matchStatusName = match.matchInfo.matchStatusName || '';
      if (match.matchInfo.sectionsNo999) {
        const scores = match.matchInfo.sectionsNo999.split(':');
        awayScore = scores[0] || '';
        homeScore = scores[1] || '';
      }
      try {
        sections = typeof match.matchInfo.sectionsNos === 'string'
          ? JSON.parse(match.matchInfo.sectionsNos || '[]')
          : (match.matchInfo.sectionsNos || []);
      } catch (e) {}
    }
    res.json({
      success: true,
      data: { playerStats, teamStats, homeScore, awayScore, sections, matchStatusName }
    });
  } catch (error) {
    console.error(`[player-stats] 错误:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取赛后开奖信息
router.get('/results', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: '请提供开始日期和结束日期' });
    }
    const result = await apiService.getBasketballMatchResults(startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
