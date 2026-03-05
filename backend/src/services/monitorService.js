const cron = require('node-cron');
const db = require('../models/dbAdapter');
const apiService = require('./apiService');

// 存储活跃的定时任务
const activeTasks = new Map();

/**
 * 执行一次监控查询并保存记录
 */
async function executeMonitorQuery(taskId, matchId) {
  try {
    const task = await db.get('SELECT * FROM monitor_tasks WHERE id = ?', [taskId]);
    if (!task || task.status !== 'running') {
      stopMonitor(taskId);
      return;
    }

    // 查询文字战况直播（包含比赛状态、比分、球队统计、球员统计）
    const today = new Date().toISOString().split('T')[0];
    const liveData = await apiService.getBasketballLive(task.match_date || today);

    let matchStatusName = '未知';
    let homeScore = '';
    let awayScore = '';
    let sectionsData = '';
    let teamStats = '';
    let playerStats = '';
    let matchStatus = '';

    if (liveData && liveData.data && liveData.data.matches) {
      const match = liveData.data.matches.find(m => String(m.matchId) === String(matchId));
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
      }
    }

    // 保存记录
    await db.run(
      `INSERT INTO monitor_records
       (task_id, match_id, record_type, raw_data, match_status, match_status_name, home_score, away_score, sections_data, team_stats, player_stats)
       VALUES (?, ?, 'live', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, matchId, JSON.stringify(liveData), matchStatus, matchStatusName, homeScore, awayScore, sectionsData, teamStats, playerStats]
    );

    // 更新任务状态
    await db.run(
      'UPDATE monitor_tasks SET match_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [matchStatusName, taskId]
    );

    // 如果比赛已结束，自动停止监控
    const endStatuses = ['6', '7', '8', 'Finished', 'Closed'];
    if (endStatuses.includes(matchStatus) || matchStatusName.includes('结束') || matchStatusName.includes('完场')) {
      await db.run(
        'UPDATE monitor_tasks SET status = ?, stopped_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['finished', taskId]
      );
      stopMonitor(taskId);
      console.log(`Task ${taskId} finished - match ended`);
    }

    console.log(`Monitor query executed for task ${taskId}, match ${matchId}: ${matchStatusName}`);
  } catch (error) {
    console.error(`Monitor query error for task ${taskId}:`, error.message);
    try {
      await db.run(
        `INSERT INTO monitor_records (task_id, match_id, record_type, raw_data, match_status_name)
         VALUES (?, ?, 'error', ?, ?)`,
        [taskId, matchId, JSON.stringify({ error: error.message }), '查询失败: ' + error.message]
      );
    } catch (dbError) {
      console.error('Failed to save error record:', dbError.message);
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
    console.log(`Task ${taskId} already running`);
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
  console.log(`Monitor started for task ${taskId}, interval: ${intervalMinutes} minutes`);
}

/**
 * 停止监控任务
 */
function stopMonitor(taskId) {
  const cronTask = activeTasks.get(taskId);
  if (cronTask) {
    cronTask.stop();
    activeTasks.delete(taskId);
    console.log(`Monitor stopped for task ${taskId}`);
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
      console.error(`Failed to restore task ${task.id}:`, error.message);
    }
  }
  console.log(`Restored ${runningTasks.length} running tasks`);
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
