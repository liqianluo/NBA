const express = require('express');
const router = express.Router();
const apiService = require('../services/apiService');
const db = require('../models/dbAdapter');

// ─────────────────────────────────────────────────────────────────────────────
// 直播赛事列表（文字战况直播）
// 说明：始终只使用 bb-text/live 接口，不做降级。
//       该接口返回当天所有有文字战况的比赛（含进行中和已结束），
//       历史日期如果 live 接口返回空，说明该日期确实无文字战况数据。
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 竞蓝赛程列表（仅未开赛赛事）
// ─────────────────────────────────────────────────────────────────────────────
router.get('/schedule', async (req, res) => {
  try {
    // 注意：basketball/list 接口不支持 date 参数，传参会导致 401 签名验证失败
    // 该接口只返回今日未开赛赛程
    const result = await apiService.getBasketballList();
    const today = new Date().toISOString().split('T')[0];

    // 保存查询记录
    try {
      const matchCount = Array.isArray(result.data) ? result.data.length : 0;
      await db.run(
        'INSERT INTO schedule_records (query_date, raw_data, match_count) VALUES (?, ?, ?)',
        [today, JSON.stringify(result), matchCount]
      );
    } catch (dbError) {
      console.error('Failed to save schedule record:', dbError.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 全部赛事列表（含已开赛/已结束，含赔率）
// 用于查看赛程和赔率，与直播赛事页面相互独立
// ─────────────────────────────────────────────────────────────────────────────
router.get('/all-list', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];
    const result = await apiService.getBasketballAllList(queryDate);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 赛事综合信息（历史交锋、积分榜等）
// ─────────────────────────────────────────────────────────────────────────────
router.get('/info/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await apiService.getBasketballInfo(matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 赛事赔率信息
// ─────────────────────────────────────────────────────────────────────────────
router.get('/odds/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const result = await apiService.getBasketballOdds(matchId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 球员统计数据
// 说明：只从 bb-text/live 接口获取球员统计，live 接口有数据就展示，
//       没有（比赛未开始或 API 不再提供）则返回提示信息。
//       Bug2 修复：之前因为 live 接口返回空数组导致一直报错找不到比赛，
//       现在改为明确区分"比赛未找到"和"比赛无球员数据"两种情况，
//       给出友好提示而不是报错。
// ─────────────────────────────────────────────────────────────────────────────
router.get('/player-stats/:matchId', async (req, res) => {
  const { matchId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, message: '请提供比赛日期（date）' });
  }

  console.log(`[player-stats] 开始请求 matchId=${matchId} date=${date}`);
  const t0 = Date.now();

  // 强制 30 秒超时包装
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('请求超时（30s），请稍后重试')), 30000)
  );

  const fetchData = async () => {
    console.log(`[player-stats] 调用 live API...`);
    const liveData = await apiService.getBasketballLive(date);
    console.log(`[player-stats] live API 返回，耗时 ${Date.now() - t0}ms`);

    const liveMatches = liveData && liveData.data && liveData.data.matches
      ? liveData.data.matches : [];

    console.log(`[player-stats] live 返回 ${liveMatches.length} 场比赛，查找 matchId=${matchId}`);

    const match = liveMatches.find(m => String(m.matchId) === String(matchId));

    if (!match) {
      // live 接口找不到该比赛：可能是比赛未开始、或该日期无文字战况数据
      const ids = liveMatches.map(m => m.matchId).join(', ');
      console.log(`[player-stats] 未找到 matchId=${matchId}，live 比赛ID列表: ${ids || '(空)'}`);
      return {
        success: true,
        data: null,
        message: liveMatches.length === 0
          ? `${date} 暂无文字战况数据，球员统计不可用`
          : `未在 ${date} 的文字战况中找到赛事（matchId=${matchId}）`,
      };
    }

    console.log(`[player-stats] 找到比赛，playerStats存在: ${!!match.playerStats}`);

    if (!match.playerStats) {
      // 找到比赛但没有球员统计（比赛可能尚未开始或数据未就绪）
      return {
        success: true,
        data: null,
        message: `比赛（${match.matchInfo?.matchStatusName || '状态未知'}）暂无球员统计数据`,
      };
    }

    // 解析 playerStats
    let playerStats = match.playerStats;
    if (typeof playerStats.awayPlayerStats === 'string') {
      try { playerStats.awayPlayerStats = JSON.parse(playerStats.awayPlayerStats); } catch (e) {}
    }
    if (typeof playerStats.homePlayerStats === 'string') {
      try { playerStats.homePlayerStats = JSON.parse(playerStats.homePlayerStats); } catch (e) {}
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

    return {
      success: true,
      data: { playerStats, teamStats, homeScore, awayScore, sections, matchStatusName },
    };
  };

  try {
    const result = await Promise.race([fetchData(), timeoutPromise]);
    console.log(`[player-stats] 完成，总耗时 ${Date.now() - t0}ms`);
    res.json(result);
  } catch (error) {
    console.error(`[player-stats] 失败，耗时 ${Date.now() - t0}ms，错误: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 赛后开奖信息
// ─────────────────────────────────────────────────────────────────────────────
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
