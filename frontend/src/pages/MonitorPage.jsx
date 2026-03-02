import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Space, Spin, Descriptions, Tabs, Typography, Statistic, Row, Col, Divider, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, StopOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';
import { useParams, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function MonitorPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [latestRecord, setLatestRecord] = useState(null);

  useEffect(() => {
    fetchTask();
    fetchRecords(1, 20);
    const interval = setInterval(() => {
      fetchTask();
      fetchRecords(1, 20);
    }, 15000);
    return () => clearInterval(interval);
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const res = await request.get(`/monitor/tasks/${taskId}`);
      if (res.success) setTask(res.data);
    } catch (e) {}
  };

  const fetchRecords = async (page, pageSize) => {
    setRecordsLoading(true);
    try {
      const res = await request.get(`/monitor/tasks/${taskId}/records?page=${page}&pageSize=${pageSize}`);
      if (res.success) {
        setRecords(res.data);
        setPagination(prev => ({ ...prev, current: page, pageSize, total: res.total }));
        if (res.data.length > 0) {
          setLatestRecord(res.data[0]);
        }
      }
    } catch (e) {
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      const res = await request.put(`/monitor/tasks/${taskId}/stop`);
      if (res.success) { message.success('监控已停止'); fetchTask(); }
    } catch (e) {}
  };

  const handleResume = async () => {
    try {
      const res = await request.put(`/monitor/tasks/${taskId}/resume`);
      if (res.success) { message.success('监控已恢复'); fetchTask(); }
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

  const parseLatestScore = () => {
    if (!latestRecord) return { home: '-', away: '-', sections: [] };
    let sections = [];
    try {
      sections = JSON.parse(latestRecord.sections_data || '[]');
    } catch (e) {}
    return {
      home: latestRecord.home_score || '-',
      away: latestRecord.away_score || '-',
      sections
    };
  };

  const parsePlayerStats = (record) => {
    if (!record?.player_stats) return null;
    try {
      return JSON.parse(record.player_stats);
    } catch (e) {
      return null;
    }
  };

  const parseTeamStats = (record) => {
    if (!record?.team_stats) return null;
    try {
      return JSON.parse(record.team_stats);
    } catch (e) {
      return null;
    }
  };

  const scoreData = parseLatestScore();
  const playerStats = latestRecord ? parsePlayerStats(latestRecord) : null;
  const teamStats = latestRecord ? parseTeamStats(latestRecord) : null;

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

  const playerColumns = [
    { title: '球员', dataIndex: 'personName', key: 'personName', width: 100 },
    { title: '号码', dataIndex: 'uniformNo', key: 'uniformNo', width: 60 },
    { title: '首发', dataIndex: 'starterFlag', key: 'starterFlag', width: 60, render: v => v === '1' ? <Tag color="green">首发</Tag> : '替补' },
    { title: '得分', dataIndex: 'totalScore', key: 'totalScore', width: 60, sorter: (a, b) => (a.totalScore || 0) - (b.totalScore || 0) },
    { title: '篮板', key: 'rebounds', width: 60, render: (_, r) => (parseInt(r.defenceReboundCnt || 0) + parseInt(r.offenseReboundCnt || 0)) },
    { title: '助攻', dataIndex: 'assistCnt', key: 'assistCnt', width: 60 },
    { title: '抢断', dataIndex: 'stealCnt', key: 'stealCnt', width: 60 },
    { title: '盖帽', dataIndex: 'blockCnt', key: 'blockCnt', width: 60 },
    { title: '失误', dataIndex: 'turnoverCnt', key: 'turnoverCnt', width: 60 },
    {
      title: '时间',
      key: 'time',
      width: 70,
      render: (_, r) => `${r.playingMinuteCnt || 0}:${String(r.playingSecondCnt || 0).padStart(2, '0')}`
    },
    { title: '+/-', dataIndex: 'plusMinusValue', key: 'plusMinusValue', width: 60 }
  ];

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
                    监控中（每 {task.interval_minutes} 分钟）
                  </span>
                )}
              </div>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchTask(); fetchRecords(1, 20); }}>
              刷新
            </Button>
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
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出 Excel
            </Button>
          </Space>
        </div>
      </div>

      {/* 实时比分卡片 */}
      <Card style={{ marginBottom: 20 }} styles={{ body: { padding: '24px 32px' } }}>
        <Row gutter={32} align="middle">
          {/* 客队 */}
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#6e6e73', marginBottom: 8 }}>
              {task.away_team || '客队'}
            </div>
            <div style={{ fontSize: 56, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>
              {scoreData.away}
            </div>
            <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 4 }}>客队</div>
          </Col>

          {/* 中间信息 */}
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8 }}>
              {task.status === 'running' ? (
                <Tag color="processing" style={{ fontSize: 13 }}>
                  {latestRecord?.match_status_name || '监控中'}
                </Tag>
              ) : (
                <Tag color="default">{latestRecord?.match_status_name || task.match_status || '未知'}</Tag>
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

          {/* 主队 */}
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

        {latestRecord && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#6e6e73', fontSize: 12 }}>
            最后更新：{dayjs(latestRecord.queried_at).format('YYYY-MM-DD HH:mm:ss')}
            &nbsp;·&nbsp; 共 {pagination.total} 条记录
          </div>
        )}
      </Card>

      {/* 详细数据 Tabs */}
      <Card styles={{ body: { padding: 0 } }}>
        <Tabs
          defaultActiveKey="records"
          style={{ padding: '0 20px' }}
          items={[
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
            {
              key: 'players',
              label: '球员统计',
              children: (
                <div style={{ padding: '0 0 16px' }}>
                  {playerStats ? (
                    <div>
                      {/* 客队球员 */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, padding: '0 4px' }}>
                          {playerStats.awayTeamShortName || '客队'} 球员数据
                        </div>
                        <Table
                          columns={playerColumns}
                          dataSource={playerStats.awayPlayerStats || []}
                          rowKey="personId"
                          pagination={false}
                          scroll={{ x: 700 }}
                          size="small"
                        />
                      </div>
                      {/* 主队球员 */}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10, padding: '0 4px' }}>
                          {playerStats.homeTeamShortName || '主队'} 球员数据
                        </div>
                        <Table
                          columns={playerColumns}
                          dataSource={playerStats.homePlayerStats || []}
                          rowKey="personId"
                          pagination={false}
                          scroll={{ x: 700 }}
                          size="small"
                        />
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>
                      暂无球员统计数据（比赛开始后可获取）
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'team_stats',
              label: '球队统计',
              children: (
                <div style={{ padding: '16px 0' }}>
                  {teamStats ? (
                    <Row gutter={24}>
                      {[
                        { key: 'away', label: teamStats.awayTeamShortName || '客队', data: teamStats.awayTeamStats },
                        { key: 'home', label: teamStats.homeTeamShortName || '主队', data: teamStats.homeTeamStats }
                      ].map(({ key, label, data }) => (
                        data && (
                          <Col span={12} key={key}>
                            <Card title={label} size="small">
                              <Descriptions column={2} size="small">
                                <Descriptions.Item label="得分">{data.totalScore}</Descriptions.Item>
                                <Descriptions.Item label="篮板">{(data.defenceReboundCnt || 0) + (data.offenseReboundCnt || 0)}</Descriptions.Item>
                                <Descriptions.Item label="助攻">{data.assistCnt}</Descriptions.Item>
                                <Descriptions.Item label="抢断">{data.stealCnt}</Descriptions.Item>
                                <Descriptions.Item label="盖帽">{data.blockCnt}</Descriptions.Item>
                                <Descriptions.Item label="失误">{data.turnoverCnt}</Descriptions.Item>
                                <Descriptions.Item label="犯规">{data.foulCnt}</Descriptions.Item>
                                <Descriptions.Item label="投篮">{data.fieldGoalMade}/{data.fieldGoalAttempted}</Descriptions.Item>
                                <Descriptions.Item label="三分">{data.threePointerMade}/{data.threePointerAttempted}</Descriptions.Item>
                                <Descriptions.Item label="罚球">{data.freeThrowMade}/{data.freeThrowAttempted}</Descriptions.Item>
                              </Descriptions>
                            </Card>
                          </Col>
                        )
                      ))}
                    </Row>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>
                      暂无球队统计数据
                    </div>
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
