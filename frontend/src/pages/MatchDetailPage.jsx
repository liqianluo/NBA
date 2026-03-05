import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Table, Spin, Button, Tag, message, Modal, Form, InputNumber, Avatar, Tooltip } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import request from '../utils/request';

// ─── 球员统计表格组件（与 MonitorPage 保持一致）─────────────────────────────
function PlayerStatsTable({ players, teamName, teamLogo, summary }) {
  if (!players || players.length === 0) return null;

  const columns = [
    { title: '背号', dataIndex: 'shirtNumber', key: 'shirtNumber', width: 52, align: 'center' },
    {
      title: '姓名', dataIndex: 'playerName', key: 'playerName', width: 110,
      render: (name, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar size={24} src={r.logoPath} icon={<UserOutlined />} />
          <span>{name}</span>
        </div>
      )
    },
    { title: '首发', dataIndex: 'isStart', key: 'isStart', width: 52, align: 'center', render: v => v === 1 || v === '1' || v === true ? '是' : '否' },
    { title: '出场时间', dataIndex: 'playTime', key: 'playTime', width: 72, align: 'center', render: v => v ? `${v}'` : '-' },
    { title: '投篮', key: 'fg', width: 72, align: 'center', render: (_, r) => `${r.fieldGoalsMade ?? 0}-${r.fieldGoalsAttempted ?? 0}` },
    { title: '三分', key: 'tp', width: 72, align: 'center', render: (_, r) => `${r.threePointersMade ?? 0}-${r.threePointersAttempted ?? 0}` },
    { title: '罚球', key: 'ft', width: 72, align: 'center', render: (_, r) => `${r.freeThrowsMade ?? 0}-${r.freeThrowsAttempted ?? 0}` },
    { title: '前篮板', dataIndex: 'offensiveRebounds', key: 'offReb', width: 62, align: 'center', render: v => v ?? 0 },
    { title: '后篮板', dataIndex: 'defensiveRebounds', key: 'defReb', width: 62, align: 'center', render: v => v ?? 0 },
    { title: '总篮板', dataIndex: 'totalRebounds', key: 'totReb', width: 62, align: 'center', render: v => v ?? 0, onHeaderCell: () => ({ style: { background: '#e8f4ff' } }), onCell: () => ({ style: { background: '#f0f8ff', fontWeight: 600 } }) },
    { title: '助攻', dataIndex: 'assists', key: 'assists', width: 52, align: 'center', render: v => v ?? 0 },
    { title: '抢断', dataIndex: 'steals', key: 'steals', width: 52, align: 'center', render: v => v ?? 0 },
    { title: '盖帽', dataIndex: 'blocks', key: 'blocks', width: 52, align: 'center', render: v => v ?? 0 },
    { title: '失误', dataIndex: 'turnovers', key: 'turnovers', width: 52, align: 'center', render: v => v ?? 0 },
    { title: '犯规', dataIndex: 'fouls', key: 'fouls', width: 52, align: 'center', render: v => v ?? 0 },
    { title: '得分', dataIndex: 'points', key: 'points', width: 52, align: 'center', render: v => v ?? 0, onHeaderCell: () => ({ style: { background: '#fff3e0' } }), onCell: () => ({ style: { background: '#fffbf0', fontWeight: 700, color: '#d46b08' } }) },
  ];

  // 汇总行
  const summaryRow = summary ? [{
    _isSummary: true,
    shirtNumber: '合计',
    playerName: '',
    isStart: '',
    playTime: '',
    fieldGoalsMade: summary.fieldGoalsMade, fieldGoalsAttempted: summary.fieldGoalsAttempted,
    threePointersMade: summary.threePointersMade, threePointersAttempted: summary.threePointersAttempted,
    freeThrowsMade: summary.freeThrowsMade, freeThrowsAttempted: summary.freeThrowsAttempted,
    offensiveRebounds: summary.offensiveRebounds,
    defensiveRebounds: summary.defensiveRebounds,
    totalRebounds: summary.totalRebounds,
    assists: summary.assists,
    steals: summary.steals,
    blocks: summary.blocks,
    turnovers: summary.turnovers,
    fouls: summary.fouls,
    points: summary.points,
  }] : [];

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {teamLogo && <Avatar size={28} src={teamLogo} />}
        <span style={{ fontWeight: 700, fontSize: 15 }}>{teamName}</span>
      </div>
      <div className="player-stats-table" style={{ overflowX: 'auto' }}>
        <Table
          columns={columns}
          dataSource={[...players, ...summaryRow]}
          rowKey={(r, i) => r._isSummary ? '__summary__' : (r.playerId || i)}
          pagination={false}
          size="small"
          rowClassName={r => r._isSummary ? 'player-summary-row' : ''}
          scroll={{ x: 900 }}
        />
      </div>
    </div>
  );
}

// ─── 主页面 ──────────────────────────────────────────────────────────────────
export default function MatchDetailPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);
  const [oddsData, setOddsData] = useState(null);
  const [monitorModal, setMonitorModal] = useState(false);
  const [monitorForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // 球员统计状态
  const [playerStats, setPlayerStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsMsg, setStatsMsg] = useState('');
  const [activeTab, setActiveTab] = useState('odds');

  const matchDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchMatchInfo();
    fetchOdds();
  }, [matchId]);

  // 切换到球员统计 Tab 时自动加载
  useEffect(() => {
    if (activeTab === 'players' && !playerStats && !statsLoading) {
      fetchPlayerStats();
    }
  }, [activeTab]);

  const fetchMatchInfo = async () => {
    setLoading(true);
    try {
      const res = await request.get(`/matches/info/${matchId}`);
      if (res.success) setMatchInfo(res.data?.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const fetchOdds = async () => {
    try {
      const res = await request.get(`/matches/odds/${matchId}`);
      if (res.success) setOddsData(res.data?.data);
    } catch (e) {}
  };

  const fetchPlayerStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsMsg('');
    try {
      const res = await request.get(`/matches/player-stats/${matchId}?date=${matchDate}`);
      if (res.success && res.data) {
        setPlayerStats(res.data);
      } else {
        setStatsMsg(res.message || '暂无球员统计数据');
      }
    } catch (e) {
      setStatsMsg('获取数据失败，请稍后重试');
    } finally {
      setStatsLoading(false);
    }
  }, [matchId, matchDate]);

  const handleStartMonitor = async (values) => {
    setSubmitting(true);
    try {
      const res = await request.post('/monitor/tasks', {
        match_id: matchId,
        match_name: `赛事 ${matchId}`,
        match_date: matchDate,
        interval_minutes: values.interval_minutes
      });
      if (res.success) {
        message.success('监控任务已创建！');
        setMonitorModal(false);
        navigate(`/monitor/${res.data.id}`);
      }
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  const oddsColumns = (type) => [
    { title: '让分/线', dataIndex: 'goalLine', key: 'goalLine', width: 100, render: v => v || '-' },
    { title: '主胜赔率', dataIndex: 'h', key: 'h', width: 100 },
    { title: '客胜赔率', dataIndex: 'a', key: 'a', width: 100 },
    { title: '更新时间', key: 'time', render: (_, r) => `${r.updateDate || ''} ${r.updateTime || ''}` }
  ];

  const historyColumns = [
    { title: '日期', dataIndex: 'matchDate', key: 'matchDate', width: 100 },
    { title: '主队', dataIndex: 'homeTeam', key: 'homeTeam', width: 100 },
    { title: '客队', dataIndex: 'awayTeam', key: 'awayTeam', width: 100 },
    { title: '比分', dataIndex: 'score', key: 'score', width: 100 },
    { title: '结果', dataIndex: 'result', key: 'result', width: 80, render: v => {
      const colorMap = { W: 'green', L: 'red', D: 'default' };
      return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
    }}
  ];

  // ── 球员统计 Tab 内容 ──
  const renderPlayerStats = () => {
    if (statsLoading) {
      return <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin tip="加载球员统计中..." /></div>;
    }
    if (!playerStats) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: '#6e6e73', marginBottom: 16 }}>{statsMsg || '暂无球员统计数据'}</div>
          <Button icon={<ReloadOutlined />} onClick={fetchPlayerStats}>重新获取</Button>
        </div>
      );
    }

    const { playerStats: ps, teamStats, homeScore, awayScore, matchStatusName } = playerStats;
    const away = ps?.awayPlayerStats || {};
    const home = ps?.homePlayerStats || {};

    // 球队汇总数据
    const awaySummary = teamStats?.stats?.away || null;
    const homeSummary = teamStats?.stats?.home || null;

    return (
      <div style={{ paddingBottom: 16 }}>
        {/* 比分头部 */}
        {(homeScore || awayScore) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24, padding: '16px', background: '#f5f5f7', borderRadius: 10 }}>
            <div style={{ textAlign: 'center' }}>
              {away.teamLogoPath && <Avatar size={36} src={away.teamLogoPath} style={{ marginBottom: 4 }} />}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{away.teamName || '客队'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: '#1d1d1f' }}>
                {awayScore} <span style={{ color: '#d2d2d7', fontWeight: 400 }}>:</span> {homeScore}
              </div>
              {matchStatusName && <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{matchStatusName}</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              {home.teamLogoPath && <Avatar size={36} src={home.teamLogoPath} style={{ marginBottom: 4 }} />}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{home.teamName || '主队'}</div>
            </div>
          </div>
        )}

        {/* 刷新按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchPlayerStats} loading={statsLoading}>
            刷新数据
          </Button>
        </div>

        {/* 客队球员统计 */}
        <PlayerStatsTable
          players={away.players || []}
          teamName={away.teamName || '客队'}
          teamLogo={away.teamLogoPath}
          summary={awaySummary}
        />

        {/* 主队球员统计 */}
        <PlayerStatsTable
          players={home.players || []}
          teamName={home.teamName || '主队'}
          teamLogo={home.teamLogoPath}
          summary={homeSummary}
        />

        {(!away.players?.length && !home.players?.length) && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>
            暂无球员统计数据（比赛可能尚未开始或数据未更新）
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>返回</Button>
            <div>
              <div className="page-title">赛事详情</div>
              <div className="page-subtitle">赛事 ID: {matchId} · {matchDate}</div>
            </div>
          </div>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => { setMonitorModal(true); monitorForm.setFieldsValue({ interval_minutes: 1 }); }}
          >
            开始监控
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Card styles={{ body: { padding: 0 } }}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            style={{ padding: '0 20px' }}
            items={[
              {
                key: 'odds',
                label: '赔率信息',
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    {oddsData ? (
                      <div>
                        {[
                          { key: 'hdcOddsList', label: '胜负 (HDC)' },
                          { key: 'mnlOddsList', label: '让分胜负 (MNL)' },
                          { key: 'wnmOddsList', label: '胜分差 (WNM)' },
                          { key: 'hiloOddsList', label: '大小分 (HILO)' }
                        ].map(({ key, label }) => (
                          oddsData[key] && oddsData[key].length > 0 && (
                            <div key={key} style={{ marginBottom: 20 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{label}</div>
                              <Table
                                columns={oddsColumns(key)}
                                dataSource={oddsData[key]}
                                rowKey={(r, i) => i}
                                pagination={false}
                                size="small"
                              />
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无赔率数据</div>
                    )}
                  </div>
                )
              },
              {
                key: 'players',
                label: '球员统计',
                children: renderPlayerStats()
              },
              {
                key: 'history',
                label: '历史交锋',
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    {matchInfo?.historyDetails ? (
                      <Table
                        columns={historyColumns}
                        dataSource={matchInfo.historyDetails}
                        rowKey={(r, i) => i}
                        pagination={{ pageSize: 10 }}
                        size="small"
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无历史交锋数据</div>
                    )}
                  </div>
                )
              },
              {
                key: 'standings',
                label: '积分榜',
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    {matchInfo?.tables ? (
                      <pre style={{ fontSize: 12, background: '#f5f5f7', padding: 16, borderRadius: 8, overflow: 'auto' }}>
                        {JSON.stringify(matchInfo.tables, null, 2)}
                      </pre>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无积分榜数据</div>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Card>
      </Spin>

      <Modal
        title="设置监控参数"
        open={monitorModal}
        onCancel={() => setMonitorModal(false)}
        footer={null}
      >
        <Form form={monitorForm} onFinish={handleStartMonitor} layout="vertical">
          <Form.Item
            label="监控间隔（分钟）"
            name="interval_minutes"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={60} style={{ width: '100%' }} size="large" addonAfter="分钟" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large" icon={<PlayCircleOutlined />}>
              开始监控
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
