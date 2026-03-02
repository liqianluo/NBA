const express = require('express');
const router = express.Router();
const db = require('../models/database');
const monitorService = require('../services/monitorService');

// 获取所有监控任务
router.get('/tasks', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM monitor_records r WHERE r.task_id = t.id) as record_count,
        (SELECT queried_at FROM monitor_records r WHERE r.task_id = t.id ORDER BY id DESC LIMIT 1) as last_queried_at
      FROM monitor_tasks t 
      ORDER BY t.created_at DESC
    `).all();

    const activeTasks = monitorService.getActiveTasks();
    const tasksWithStatus = tasks.map(t => ({
      ...t,
      is_active: activeTasks.includes(t.id)
    }));

    res.json({ success: true, data: tasksWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 创建监控任务
router.post('/tasks', (req, res) => {
  try {
    const { match_id, match_name, home_team, away_team, league_name, match_date, match_time, interval_minutes } = req.body;
    if (!match_id || !match_name) {
      return res.status(400).json({ success: false, message: '赛事ID和名称不能为空' });
    }

    // 检查是否已有相同赛事的运行中任务
    const existing = db.prepare('SELECT id FROM monitor_tasks WHERE match_id = ? AND status = ?').get(match_id, 'running');
    if (existing) {
      return res.status(400).json({ success: false, message: '该赛事已有正在运行的监控任务' });
    }

    const result = db.prepare(`
      INSERT INTO monitor_tasks (match_id, match_name, home_team, away_team, league_name, match_date, match_time, interval_minutes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'running')
    `).run(match_id, match_name, home_team || '', away_team || '', league_name || '', match_date || '', match_time || '', interval_minutes || 5);

    const taskId = result.lastInsertRowid;

    // 启动监控
    monitorService.startMonitor(taskId);

    res.json({ success: true, data: { id: taskId }, message: '监控任务创建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取单个任务详情
router.get('/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM monitor_tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    const activeTasks = monitorService.getActiveTasks();
    res.json({ success: true, data: { ...task, is_active: activeTasks.includes(task.id) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 停止监控任务
router.put('/tasks/:id/stop', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = db.prepare('SELECT * FROM monitor_tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    monitorService.stopMonitor(taskId);
    db.prepare('UPDATE monitor_tasks SET status = ?, stopped_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('stopped', taskId);

    res.json({ success: true, message: '监控已停止' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 继续监控任务
router.put('/tasks/:id/resume', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = db.prepare('SELECT * FROM monitor_tasks WHERE id = ?').get(taskId);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    if (task.status === 'finished') {
      return res.status(400).json({ success: false, message: '赛事已结束，无法继续监控' });
    }

    db.prepare('UPDATE monitor_tasks SET status = ?, stopped_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('running', taskId);
    monitorService.startMonitor(taskId);

    res.json({ success: true, message: '监控已恢复' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除任务（按日期范围）
router.delete('/tasks', (req, res) => {
  try {
    const { startDate, endDate, taskIds } = req.body;

    if (taskIds && Array.isArray(taskIds)) {
      // 按 ID 删除
      for (const id of taskIds) {
        monitorService.stopMonitor(id);
        db.prepare('DELETE FROM monitor_records WHERE task_id = ?').run(id);
        db.prepare('DELETE FROM monitor_tasks WHERE id = ?').run(id);
      }
      return res.json({ success: true, message: `已删除 ${taskIds.length} 个任务` });
    }

    if (startDate && endDate) {
      // 按日期范围删除
      const tasks = db.prepare('SELECT id FROM monitor_tasks WHERE DATE(created_at) BETWEEN ? AND ?').all(startDate, endDate);
      for (const task of tasks) {
        monitorService.stopMonitor(task.id);
        db.prepare('DELETE FROM monitor_records WHERE task_id = ?').run(task.id);
      }
      const result = db.prepare('DELETE FROM monitor_tasks WHERE DATE(created_at) BETWEEN ? AND ?').run(startDate, endDate);
      return res.json({ success: true, message: `已删除 ${result.changes} 个任务` });
    }

    res.status(400).json({ success: false, message: '请提供删除条件' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除单个任务
router.delete('/tasks/:id', (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    monitorService.stopMonitor(taskId);
    db.prepare('DELETE FROM monitor_records WHERE task_id = ?').run(taskId);
    db.prepare('DELETE FROM monitor_tasks WHERE id = ?').run(taskId);
    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取任务的监控记录
router.get('/tasks/:id/records', (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM monitor_records WHERE task_id = ?').get(req.params.id);
    const records = db.prepare(`
      SELECT * FROM monitor_records WHERE task_id = ? 
      ORDER BY queried_at DESC 
      LIMIT ? OFFSET ?
    `).all(req.params.id, parseInt(pageSize), parseInt(offset));

    res.json({
      success: true,
      data: records,
      total: total.count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 导出任务记录为 Excel
router.get('/tasks/:id/export', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const task = db.prepare('SELECT * FROM monitor_tasks WHERE id = ?').get(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: '任务不存在' });

    const records = db.prepare('SELECT * FROM monitor_records WHERE task_id = ? ORDER BY queried_at ASC').all(req.params.id);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NBA Monitor';
    workbook.created = new Date();

    // 任务概览 Sheet
    const overviewSheet = workbook.addWorksheet('任务概览');
    overviewSheet.columns = [
      { header: '字段', key: 'field', width: 20 },
      { header: '值', key: 'value', width: 40 }
    ];
    overviewSheet.addRows([
      { field: '任务ID', value: task.id },
      { field: '赛事名称', value: task.match_name },
      { field: '主队', value: task.home_team },
      { field: '客队', value: task.away_team },
      { field: '联赛', value: task.league_name },
      { field: '比赛日期', value: task.match_date },
      { field: '比赛时间', value: task.match_time },
      { field: '监控间隔(分钟)', value: task.interval_minutes },
      { field: '任务状态', value: task.status },
      { field: '创建时间', value: task.created_at },
      { field: '记录总数', value: records.length }
    ]);

    // 监控记录 Sheet
    const recordSheet = workbook.addWorksheet('监控记录');
    recordSheet.columns = [
      { header: '序号', key: 'index', width: 8 },
      { header: '查询时间', key: 'queried_at', width: 22 },
      { header: '比赛状态', key: 'match_status_name', width: 15 },
      { header: '主队得分', key: 'home_score', width: 12 },
      { header: '客队得分', key: 'away_score', width: 12 },
      { header: '各节比分', key: 'sections_data', width: 50 },
      { header: '类型', key: 'record_type', width: 10 }
    ];

    records.forEach((record, index) => {
      // 解析各节比分
      let sectionsText = '';
      try {
        const sections = JSON.parse(record.sections_data || '[]');
        sectionsText = sections.map(s => {
          const sectionName = s.sectionNo === -1 ? '加时' : `第${s.sectionNo}节`;
          return `${sectionName}: ${s.score}`;
        }).join(' | ');
      } catch (e) {
        sectionsText = record.sections_data || '';
      }

      recordSheet.addRow({
        index: index + 1,
        queried_at: record.queried_at,
        match_status_name: record.match_status_name,
        home_score: record.home_score,
        away_score: record.away_score,
        sections_data: sectionsText,
        record_type: record.record_type
      });
    });

    // 球员统计 Sheet（取最后一条有球员数据的记录）
    const lastRecordWithPlayers = records.reverse().find(r => r.player_stats);
    if (lastRecordWithPlayers) {
      try {
        const playerData = JSON.parse(lastRecordWithPlayers.player_stats);
        const playerSheet = workbook.addWorksheet('球员统计');
        playerSheet.columns = [
          { header: '队伍', key: 'team', width: 12 },
          { header: '球员姓名', key: 'name', width: 15 },
          { header: '球衣号', key: 'uniformNo', width: 8 },
          { header: '是否首发', key: 'starter', width: 10 },
          { header: '得分', key: 'totalScore', width: 8 },
          { header: '篮板', key: 'rebounds', width: 8 },
          { header: '助攻', key: 'assistCnt', width: 8 },
          { header: '抢断', key: 'stealCnt', width: 8 },
          { header: '盖帽', key: 'blockCnt', width: 8 },
          { header: '失误', key: 'turnoverCnt', width: 8 },
          { header: '出场时间', key: 'playingTime', width: 12 },
          { header: '正负值', key: 'plusMinus', width: 8 }
        ];

        const addPlayerRows = (players, teamName) => {
          if (!players) return;
          try {
            const playerList = typeof players === 'string' ? JSON.parse(players) : players;
            playerList.forEach(p => {
              const rebounds = (parseInt(p.defenceReboundCnt || 0) + parseInt(p.offenseReboundCnt || 0)).toString();
              const playingTime = `${p.playingMinuteCnt || 0}:${String(p.playingSecondCnt || 0).padStart(2, '0')}`;
              playerSheet.addRow({
                team: teamName,
                name: p.personName,
                uniformNo: p.uniformNo,
                starter: p.starterFlag === '1' ? '首发' : '替补',
                totalScore: p.totalScore,
                rebounds,
                assistCnt: p.assistCnt,
                stealCnt: p.stealCnt,
                blockCnt: p.blockCnt,
                turnoverCnt: p.turnoverCnt,
                playingTime,
                plusMinus: p.plusMinusValue
              });
            });
          } catch (e) {}
        };

        addPlayerRows(playerData.awayPlayerStats, playerData.awayTeamShortName || '客队');
        addPlayerRows(playerData.homePlayerStats, playerData.homeTeamShortName || '主队');
      } catch (e) {
        console.error('Failed to parse player stats:', e.message);
      }
    }

    // 设置响应头
    const fileName = encodeURIComponent(`${task.match_name}_监控记录.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
