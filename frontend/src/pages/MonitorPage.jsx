import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Table, Tag, Space, Spin, Descriptions, Tabs, Row, Col, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, StopOutlined, PlayCircleOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';
import { useParams, useNavigate } from 'react-router-dom';

export default function MonitorPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [latestRecord, setLatestRecord] = useState(null);
  // 球员统计专用状态（来自 latest-stats 接口）
  const [latestStats, setLatestStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('players');
  // 定时器 ref，方便在任意位置清除
  const intervalRef = useRef(null);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchTask = useCallback(async () => {
    try {
      const res = await request.get(`/monitor/tasks/${taskId}`);
      if (res.success) {
        setTask(res.data);
        // 监控已停止或赛事已结束 → 关闭自动刷新
        if (res.data.status !== 'running') {
          stopAutoRefresh();
        }
      }
    } catch (e) {}
  }, [taskId, stopAutoRefresh]);

  const fetchRecords = useCallback(async (page, pageSize) => {
    setRecordsLoading(true);
    try {
      const res = await request.get(`/monitor/tasks/${taskId}/records?page=${page}&pageSize=${pageSize}`);
      if (res.success) {
        setRecords(res.data);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: res.total }));
        if (res.data.length > 0) setLatestRecord(res.data[0]);
      }
    } catch (e) {
    } finally {
      setRecordsLoading(false);
    }
  }, [taskId]);

  const fetchLatestStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await request.get(`/monitor/tasks/${taskId}/latest-stats`);
      if (res.success && res.data) {
        setLatestStats(res.data);
        setStatsUpdatedAt(res.data.queriedAt);
      }
    } catch (e) {
    } finally {
      setStatsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
    fetchRecords(1, 20);
    fetchLatestStats();
    // 每 60 秒自动刷新一次（仅在监控运行中时有效）
    intervalRef.current = setInterval(() => {
      fetchTask();        // fetchTask 内部会判断状态，非 running 时自动停止定时器
      fetchRecords(1, 20);
      fetchLatestStats();
    }, 60000);
    return () => stopAutoRefresh();
  }, [taskId, fetchTask, fetchRecords, fetchLatestStats, stopAutoRefresh]);

  const handleStop = async () => {
    try {
      const res = await request.put(`/monitor/tasks/${taskId}/stop`);
      if (res.success) { message.success('监控已停止'); fetchTask(); }
    } catch (e) {}
  };

  const handleResume = async () => {
    try {
      const res = await request.put(`/monitor/tasks/${taskId}/resume`);
      if (res.success) {
        message.success('监控已恢复');
        fetchTask();
        fetchRecords(1, 20);
        fetchLatestStats();
        // 重新启动自动刷新定时器
        stopAutoRefresh();
        intervalRef.current = setInterval(() => {
          fetchTask();
          fetchRecords(1, 20);
          fetchLatestStats();
        }, 60000);
      }
    } catch (e) {}
  };

  const handleExport = () => {
    if (!task) return;
    const url = `/api/monitor/tasks/${taskId}/export`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.match_name}_监控记录.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRefreshAll = () => {
    fetchTask();
    fetchRecords(1, 20);
    fetchLatestStats();
  };

  // 解析比分
  const parseLatestScore = () => {
    const src = latestStats || latestRecord;
    if (!src) return { home: '-', away: '-', sections: [] };
    let sections = [];
    try {
      const raw = latestStats ? latestStats.sections : src.sections_data;
      sections = typeof raw === 'string' ? JSON.parse(raw || '[]') : (raw || []);
    } catch (e) {}
    return {
      home: (latestStats ? latestStats.homeScore : src.home_score) || '-',
      away: (latestStats ? latestStats.awayScore : src.away_score) || '-',
      sections
    };
  };

  const scoreData = parseLatestScore();

  // ---- 球员统计表格列定义（与图片一致）----
  const buildPlayerColumns = () => [
    {
      title: '背号',
      dataIndex: 'uniformNo',
      key: 'uniformNo',
      width: 52,
      align: 'center',
      fixed: 'left',
    },
    {
      title: '姓名',
      dataIndex: 'personName',
      key: 'personName',
      width: 90,
      fixed: 'left',
    },
    {
      title: '首发',
      dataIndex: 'starterFlag',
      key: 'starterFlag',
      width: 52,
      align: 'center',
      render: v => {
        if (v === '1') return <span style={{ color: '#1677ff', fontWeight: 600 }}>是</span>;
        if (v === '0') return <span style={{ color: '#8c8c8c' }}>否</span>;
        return <span style={{ color: '#bbb' }}>—</span>;
      }
    },
    {
      title: '出场时间',
      key: 'playingTime',
      width: 72,
      align: 'center',
      render: (_, r) => {
        if (r.playingFlag === '0' || (!r.playingMinuteCnt && !r.playingSecondCnt)) {
          return <span style={{ color: '#bbb' }}>未出场</span>;
        }
        return `${r.playingMinuteCnt || 0}'`;
      }
    },
    {
      title: '投篮',
      key: 'fieldGoal',
      width: 64,
      align: 'center',
      render: (_, r) => `${r.goalCnt ?? '-'}-${r.shotCnt ?? '-'}`
    },
    {
      title: '三分',
      key: 'threePoint',
      width: 64,
      align: 'center',
      render: (_, r) => `${r.threePointGoalCnt ?? '-'}-${r.threePointShotCnt ?? '-'}`
    },
    {
      title: '罚球',
      key: 'freeThrow',
      width: 64,
      align: 'center',
      render: (_, r) => `${r.freeThrowGoalCnt ?? '-'}-${r.freeThrowShotCnt ?? '-'}`
    },
    {
      title: '前篮板',
      dataIndex: 'offenseReboundCnt',
      key: 'offenseReboundCnt',
      width: 64,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '后篮板',
      dataIndex: 'defenceReboundCnt',
      key: 'defenceReboundCnt',
      width: 64,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '总篮板',
      key: 'totalRebounds',
      width: 64,
      align: 'center',
      render: (_, r) => {
        const off = parseInt(r.offenseReboundCnt || 0);
        const def = parseInt(r.defenceReboundCnt || 0);
        return off + def || '-';
      }
    },
    {
      title: '助攻',
      dataIndex: 'assistCnt',
      key: 'assistCnt',
      width: 52,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '抢断',
      dataIndex: 'stealCnt',
      key: 'stealCnt',
      width: 52,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '盖帽',
      dataIndex: 'blockCnt',
      key: 'blockCnt',
      width: 52,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '失误',
      dataIndex: 'turnoverCnt',
      key: 'turnoverCnt',
      width: 52,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '犯规',
      dataIndex: 'personalFoulCnt',
      key: 'personalFoulCnt',
      width: 52,
      align: 'center',
      render: v => v ?? '-'
    },
    {
      title: '得分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 60,
      align: 'center',
      fixed: 'right',
      render: v => (
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1d1d1f' }}>{v ?? '-'}</span>
      ),
      sorter: (a, b) => parseInt(a.totalScore || 0) - parseInt(b.totalScore || 0),
    },
  ];

  // 球队汇总行
  const buildTeamSummaryRow = (players) => {
    if (!players || players.length === 0) return null;
    const sum = (key) => players.reduce((acc, p) => acc + parseInt(p[key] || 0), 0);
    const totalGoal = sum('goalCnt');
    const totalShot = sum('shotCnt');
    const total3Goal = sum('threePointGoalCnt');
    const total3Shot = sum('threePointShotCnt');
    const totalFTGoal = sum('freeThrowGoalCnt');
    const totalFTShot = sum('freeThrowShotCnt');
    const totalOff = sum('offenseReboundCnt');
    const totalDef = sum('defenceReboundCnt');
    return {
      personId: '__summary__',
      personName: '',
      uniformNo: '',
      starterFlag: null,
      playingFlag: null,
      goalCnt: totalGoal,
      shotCnt: totalShot,
      threePointGoalCnt: total3Goal,
      threePointShotCnt: total3Shot,
      freeThrowGoalCnt: totalFTGoal,
      freeThrowShotCnt: totalFTShot,
      offenseReboundCnt: totalOff,
      defenceReboundCnt: totalDef,
      assistCnt: sum('assistCnt'),
      stealCnt: sum('stealCnt'),
      blockCnt: sum('blockCnt'),
      turnoverCnt: sum('turnoverCnt'),
      personalFoulCnt: sum('personalFoulCnt'),
      totalScore: sum('totalScore'),
      _isSummary: true,
    };
  };

  // 渲染一支球队的统计表格
  const renderTeamTable = (teamName, players, teamLogoPath) => {
    if (!players || players.length === 0) return null;
    const summaryRow = buildTeamSummaryRow(players);
    const dataWithSummary = summaryRow ? [...players, summaryRow] : players;
    const columns = buildPlayerColumns();

    return (
      <div style={{ marginBottom: 32 }}>
        {/* 球队标题行 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', background: '#f5f5f7', borderRadius: '8px 8px 0 0',
          borderBottom: '2px solid #e5e5ea'
        }}>
          {teamLogoPath && (
            <img
              src={teamLogoPath.startsWith('//') ? `https:${teamLogoPath}` : teamLogoPath}
              alt={teamName}
              style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>{teamName}</span>
        </div>

        <Table
          columns={columns}
          dataSource={dataWithSummary}
          rowKey="personId"
          pagination={false}
          scroll={{ x: 900 }}
          size="small"
          bordered
          rowClassName={(record) => record._isSummary ? 'player-summary-row' : ''}
          onRow={(record) => ({
            style: record._isSummary ? {
              background: '#f0f0f0',
              fontWeight: 600,
              borderTop: '2px solid #d9d9d9',
            } : {}
          })}
        />
      </div>
    );
  };

  // 球员统计 Tab 内容
  const renderPlayersTab = () => {
    if (statsLoading && !latestStats) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="加载球员统计中..." />
        </div>
      );
    }

    const ps = latestStats?.playerStats;
    if (!ps) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6e6e73' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>暂无球员统计数据</div>
          <div style={{ fontSize: 13 }}>比赛开始后将自动获取，每分钟更新一次</div>
        </div>
      );
    }

    const awayPlayers = Array.isArray(ps.awayPlayerStats) ? ps.awayPlayerStats : [];
    const homePlayers = Array.isArray(ps.homePlayerStats) ? ps.homePlayerStats : [];

    return (
      <div style={{ padding: '0 0 16px' }}>
        {/* 更新时间提示 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 4px 16px', color: '#6e6e73', fontSize: 12
        }}>
          <span>
            {statsUpdatedAt && `数据更新时间：${dayjs(statsUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}`}
            {task?.status === 'running' && (
              <span style={{ marginLeft: 8, color: '#34c759' }}>
                <SyncOutlined spin style={{ marginRight: 4 }} />
                每分钟自动刷新
              </span>
            )}
          </span>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchLatestStats} loading={statsLoading}>
            立即刷新
          </Button>
        </div>

        {/* 客队 */}
        {renderTeamTable(
          ps.awayTeamShortName || '客队',
          awayPlayers,
          latestStats?.teamStats?.awayTeamLogoPath
        )}

        {/* 主队 */}
        {renderTeamTable(
          ps.homeTeamShortName || '主队',
          homePlayers,
          latestStats?.teamStats?.homeTeamLogoPath
        )}
      </div>
    );
  };

  // 监控记录列
  const recordColumns = [
    {
      title: '查询时间',
      dataIndex: 'queried_at',
      key: 'queried_at',
      width: 160,
      render: (v) => dayjs(v).format('HH:mm:ss')
    },
    {
      title: '比赛状态',
      dataIndex: 'match_status_name',
      key: 'match_status_name',
      width: 100,
      render: (v) => <Tag>{v || '-'}</Tag>
    },
    {
      title: '比分（客:主）',
      key: 'score',
      width: 120,
      render: (_, r) => (
        <span style={{ fontWeight: 700, fontSize: 16 }}>
          {r.away_score || '-'} : {r.home_score || '-'}
        </span>
      )
    },
    {
      title: '各节比分',
      dataIndex: 'sections_data',
      key: 'sections_data',
      render: (v) => {
        try {
          const sections = JSON.parse(v || '[]');
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {sections.map(s => (
                <span key={s.sectionNo} className="section-score">
                  {s.sectionNo === -1 ? 'OT' : `Q${s.sectionNo}`}: {s.score}
                </span>
              ))}
            </div>
          );
        } catch (e) {
          return v || '-';
        }
      }
    },
    {
      title: '类型',
      dataIndex: 'record_type',
      key: 'record_type',
      width: 80,
      render: (v) => v === 'error' ? <Tag color="red">错误</Tag> : <Tag color="blue">直播</Tag>
    }
  ];

  // 球队统计 Tab
  const renderTeamStatsTab = () => {
    const ts = latestStats?.teamStats;
    if (!ts || !ts.stats) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>
          暂无球队统计数据
        </div>
      );
    }
    const statsArr = Array.isArray(ts.stats) ? ts.stats : [];
    const statColumns = [
      { title: '统计项', dataIndex: 'statsTcDesc', key: 'statsTcDesc', width: 100 },
      {
        title: ts.awayTeamShortName || '客队',
        dataIndex: 'awayStatsData',
        key: 'awayStatsData',
        align: 'center',
        render: (v, r) => (
          <span>
            {v}
            {r.awayStatsDataRatio ? <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 4 }}>({r.awayStatsDataRatio}%)</span> : null}
          </span>
        )
      },
      {
        title: ts.homeTeamShortName || '主队',
        dataIndex: 'homeStatsData',
        key: 'homeStatsData',
        align: 'center',
        render: (v, r) => (
          <span>
            {v}
            {r.homeStatsDataRatio ? <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 4 }}>({r.homeStatsDataRatio}%)</span> : null}
          </span>
        )
      },
    ];
    return (
      <div style={{ padding: '8px 0 16px' }}>
        <Table
          columns={statColumns}
          dataSource={statsArr}
          rowKey="statsTc"
          pagination={false}
          size="small"
          bordered
          style={{ maxWidth: 600 }}
        />
      </div>
    );
  };

  if (!task) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>返回</Button>
            <div>
              <div className="page-title">{task.match_name}</div>
              <div className="page-subtitle">
                {task.match_date} {task.match_time} · {task.league_name}
                {task.status === 'running' && (
                  <span style={{ marginLeft: 8, color: '#34c759' }}>
                    <span className="live-dot" style={{ marginRight: 4 }} />
                    监控中（每 {task.interval_minutes || 1} 分钟）
                  </span>
                )}
              </div>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleRefreshAll}>刷新</Button>
            {task.status === 'running' && (
              <Popconfirm title="确认停止监控？" onConfirm={handleStop}>
                <Button danger icon={<StopOutlined />}>停止监控</Button>
              </Popconfirm>
            )}
            {task.status === 'stopped' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleResume}>
                继续监控
              </Button>
            )}
            <Button icon={<DownloadOutlined />} onClick={handleExport}>导出 Excel</Button>
          </Space>
        </div>
      </div>

      {/* 实时比分卡片 */}
      <Card style={{ marginBottom: 20 }} styles={{ body: { padding: '24px 32px' } }}>
        <Row gutter={32} align="middle">
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6e6e73', marginBottom: 8 }}>
              {task.away_team || '客队'}
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>
              {scoreData.away}
            </div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>客队</div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              {task.status === 'running' ? (
                <Tag color="processing" style={{ fontSize: 13 }}>
                  {latestStats?.matchStatusName || latestRecord?.match_status_name || '监控中'}
                </Tag>
              ) : (
                <Tag color="default">{latestStats?.matchStatusName || latestRecord?.match_status_name || task.match_status || '未知'}</Tag>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#6e6e73' }}>VS</div>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4 }}>
              {scoreData.sections.map(s => (
                <span key={s.sectionNo} className="section-score">
                  {s.sectionNo === -1 ? 'OT' : `Q${s.sectionNo}`}: {s.score}
                </span>
              ))}
            </div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6e6e73', marginBottom: 8 }}>
              {task.home_team || '主队'}
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>
              {scoreData.home}
            </div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>主队</div>
          </Col>
        </Row>
        {(statsUpdatedAt || latestRecord) && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#6e6e73', fontSize: 12 }}>
            最后更新：{dayjs(statsUpdatedAt || latestRecord?.queried_at).format('YYYY-MM-DD HH:mm:ss')}
            &nbsp;·&nbsp; 共 {pagination.total} 条记录
          </div>
        )}
      </Card>

      {/* 详细数据 Tabs */}
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 20px' }}
          items={[
            {
              key: 'players',
              label: (
                <span>
                  球员统计
                  {task.status === 'running' && (
                    <SyncOutlined spin style={{ marginLeft: 6, color: '#34c759', fontSize: 12 }} />
                  )}
                </span>
              ),
              children: renderPlayersTab()
            },
            {
              key: 'team_stats',
              label: '球队统计',
              children: renderTeamStatsTab()
            },
            {
              key: 'records',
              label: `监控记录 (${pagination.total})`,
              children: (
                <div style={{ padding: '0 0 16px' }}>
                  <Table
                    columns={recordColumns}
                    dataSource={records}
                    rowKey="id"
                    loading={recordsLoading}
                    pagination={{
                      ...pagination,
                      onChange: (page, pageSize) => fetchRecords(page, pageSize),
                      showTotal: (total) => `共 ${total} 条记录`
                    }}
                    scroll={{ x: 700 }}
                    size="small"
                  />
                </div>
              )
            },
          ]}
        />
      </Card>
    </div>
  );
}
