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
