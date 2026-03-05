const cron = require('node-cron');
const db = require('../models/dbAdapter');
const apiService = require('./apiService');

// 存储活跃的定时任务
const activeTasks = new Map();

/**
 * 执行一次监控查询并保存记录
 * 说明：始终只使用 bb-text/live 接口获取数据（含实时比分、球员统计）。
 *       live 接口对当天进行中和已结束的比赛均有数据，是监控的唯一数据源。
 */
async function executeMonitorQuery(taskId, matchId) {
  try {
    const task = await db.get('SELECT * FROM monitor_tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'running') {
      stopMonitor(taskId);
      return;
    }

    const matchDate = task.match_date || new Date().toISOString().split('T')[0];

    let matchStatusName = '未知';
    let homeScore = '';
    let awayScore = '';
    let sectionsData = '';
    let teamStats = '';
    let playerStats = '';
    let matchStatus = '';

    // 从 bb-text/live 接口获取数据
    const liveData = await apiService.getBasketballLive(matchDate);
    const liveMatches = liveData && liveData.data && liveData.data.matches
      ? liveData.data.matches : [];
    const match = liveMatches.find(m => String(m.matchId) === String(matchId));

    if (match) {
      if (match.matchInfo) {
        matchStatusName = match.matchInfo.matchStatusName || '未知';
        matchStatus = match.matchInfo.matchStatus || '';
        if (match.matchInfo.sectionsNo999) {
          const scores = match.matchInfo.sectionsNo999.split(':');
          awayScore = scores[0] || '';
          homeScore = scores[1] || '';
        }
        sectionsData = match.matchInfo.sectionsNos || '';
      }
      if (match.teamStats) teamStats = JSON.stringify(match.teamStats);
      if (match.playerStats) playerStats = JSON.stringify(match.playerStats);
    } else {
      // live 接口未返回该比赛：可能比赛尚未开始，记录为等待中
      matchStatusName = '等待数据';
      console.log(`[monitor] task ${taskId}: matchId=${matchId} 未在 live 接口中找到（共 ${liveMatches.length} 场）`);
    }

    // 保存记录
    await db.run(
      `INSERT INTO monitor_records
       (task_id, match_id, record_type, raw_data, match_status, match_status_name, home_score, away_score, sections_data, team_stats, player_stats)
       VALUES (?, ?, 'live', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId, matchId,
        JSON.stringify(liveData),
        matchStatus, matchStatusName,
        homeScore, awayScore,
        sectionsData, teamStats, playerStats
      ]
    );

    // 更新任务状态
    await db.run(
      'UPDATE monitor_tasks SET match_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [matchStatusName, taskId]
    );

    // 比赛结束自动停止监控
    const endStatuses = ['6', '7', '8', 'Finished', 'Closed'];
    if (
      endStatuses.includes(matchStatus) ||
      matchStatusName.includes('结束') ||
      matchStatusName.includes('完场')
    ) {
      await db.run(
        'UPDATE monitor_tasks SET status = ?, stopped_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['finished', taskId]
      );
      stopMonitor(taskId);
      console.log(`[monitor] task ${taskId} finished - match ended (${matchStatusName})`);
    }

    console.log(`[monitor] task ${taskId}, match ${matchId}: ${matchStatusName} | ${awayScore}-${homeScore}`);
  } catch (error) {
    console.error(`[monitor] query error for task ${taskId}:`, error.message);
    try {
      await db.run(
        `INSERT INTO monitor_records (task_id, match_id, record_type, raw_data, match_status_name)
         VALUES (?, ?, 'error', ?, ?)`,
        [taskId, matchId, JSON.stringify({ error: error.message }), '查询失败: ' + error.message]
      );
    } catch (dbError) {
      console.error('[monitor] Failed to save error record:', dbError.message);
    }
  }
}

/**
 * 启动监控任务
 */
async function startMonitor(taskId) {
  const task = await db.get('SELECT * FROM monitor_tasks WHERE id = ?', [taskId]);
  if (!task) throw new Error('任务不存在');

  if (activeTasks.has(taskId)) {
    console.log(`[monitor] task ${taskId} already running`);
    return;
  }

  const intervalMinutes = task.interval_minutes || 1;

  // 立即执行一次
  executeMonitorQuery(taskId, task.match_id);

  // 设置定时任务
  const cronExpression = `*/${intervalMinutes} * * * *`;
  const cronTask = cron.schedule(cronExpression, () => {
    executeMonitorQuery(taskId, task.match_id);
  });

  activeTasks.set(taskId, cronTask);
  console.log(`[monitor] task ${taskId} started, interval: ${intervalMinutes} min`);
}

/**
 * 停止监控任务
 */
function stopMonitor(taskId) {
  const cronTask = activeTasks.get(taskId);
  if (cronTask) {
    cronTask.stop();
    activeTasks.delete(taskId);
    console.log(`[monitor] task ${taskId} stopped`);
  }
}

/**
 * 恢复所有运行中的任务（服务重启时）
 */
async function restoreRunningTasks() {
  const runningTasks = await db.all(
    'SELECT * FROM monitor_tasks WHERE status = ?',
    ['running']
  );
  for (const task of runningTasks) {
    try {
      await startMonitor(task.id);
    } catch (error) {
      console.error(`[monitor] Failed to restore task ${task.id}:`, error.message);
    }
  }
  console.log(`[monitor] Restored ${runningTasks.length} running tasks`);
}

/**
 * 获取活跃任务列表
 */
function getActiveTasks() {
  return Array.from(activeTasks.keys());
}

module.exports = {
  startMonitor,
  stopMonitor,
  restoreRunningTasks,
  getActiveTasks,
  executeMonitorQuery
};
