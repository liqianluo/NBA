import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Table, Spin, Button, Tag, message, Modal, Form, InputNumber, Row, Col, Statistic, Progress, Space, Divider } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined, ReloadOutlined, TrophyOutlined, BarChartOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import request from '../utils/request';

// ─── 球员统计表格组件 ─────────────────────────────────────────────────────────
function PlayerStatsTable({ players, teamName, teamLogoPath }) {
  if (!players || players.length === 0) return null;

  const columns = [
    { title: '背号', dataIndex: 'uniformNo', key: 'uniformNo', width: 52, align: 'center', fixed: 'left' },
    { title: '姓名', dataIndex: 'personName', key: 'personName', width: 100, fixed: 'left' },
    {
      title: '首发', dataIndex: 'starterFlag', key: 'starterFlag', width: 52, align: 'center',
      render: v => {
        if (v === '1') return <span style={{ color: '#1677ff', fontWeight: 600 }}>是</span>;
        if (v === '0') return <span style={{ color: '#8c8c8c' }}>否</span>;
        return <span style={{ color: '#bbb' }}>—</span>;
      }
    },
    {
      title: '出场时间', key: 'playingTime', width: 72, align: 'center',
      render: (_, r) => {
        if (r.playingFlag === '0' || (!r.playingMinuteCnt && !r.playingSecondCnt)) {
          return <span style={{ color: '#bbb' }}>未出场</span>;
        }
        return `${r.playingMinuteCnt || 0}'`;
      }
    },
    { title: '投篮', key: 'fg', width: 64, align: 'center', render: (_, r) => `${r.goalCnt ?? '-'}-${r.shotCnt ?? '-'}` },
    { title: '三分', key: 'tp', width: 64, align: 'center', render: (_, r) => `${r.threePointGoalCnt ?? '-'}-${r.threePointShotCnt ?? '-'}` },
    { title: '罚球', key: 'ft', width: 64, align: 'center', render: (_, r) => `${r.freeThrowGoalCnt ?? '-'}-${r.freeThrowShotCnt ?? '-'}` },
    { title: '前篮板', dataIndex: 'offenseReboundCnt', key: 'offReb', width: 62, align: 'center', render: v => v ?? '-' },
    { title: '后篮板', dataIndex: 'defenceReboundCnt', key: 'defReb', width: 62, align: 'center', render: v => v ?? '-' },
    {
      title: '总篮板', key: 'totReb', width: 62, align: 'center',
      onHeaderCell: () => ({ style: { background: '#e8f4ff' } }),
      onCell: () => ({ style: { background: '#f0f8ff', fontWeight: 600 } }),
      render: (_, r) => (parseInt(r.offenseReboundCnt || 0) + parseInt(r.defenceReboundCnt || 0)) || '-'
    },
    { title: '助攻', dataIndex: 'assistCnt', key: 'assistCnt', width: 52, align: 'center', render: v => v ?? '-' },
    { title: '抢断', dataIndex: 'stealCnt', key: 'stealCnt', width: 52, align: 'center', render: v => v ?? '-' },
    { title: '盖帽', dataIndex: 'blockCnt', key: 'blockCnt', width: 52, align: 'center', render: v => v ?? '-' },
    { title: '失误', dataIndex: 'turnoverCnt', key: 'turnoverCnt', width: 52, align: 'center', render: v => v ?? '-' },
    { title: '犯规', dataIndex: 'personalFoulCnt', key: 'personalFoulCnt', width: 52, align: 'center', render: v => v ?? '-' },
    {
      title: '得分', dataIndex: 'totalScore', key: 'totalScore', width: 60, align: 'center', fixed: 'right',
      onHeaderCell: () => ({ style: { background: '#fff3e0' } }),
      onCell: () => ({ style: { background: '#fffbf0' } }),
      render: v => <span style={{ fontWeight: 700, fontSize: 14, color: '#d46b08' }}>{v ?? '-'}</span>,
      sorter: (a, b) => parseInt(a.totalScore || 0) - parseInt(b.totalScore || 0),
    },
    {
      title: '+/-', dataIndex: 'plusMinusValue', key: 'plusMinus', width: 52, align: 'center',
      render: v => {
        if (v === null || v === undefined) return '-';
        const n = parseInt(v);
        return <span style={{ color: n > 0 ? '#34c759' : n < 0 ? '#ff3b30' : '#8c8c8c', fontWeight: 600 }}>{n > 0 ? `+${n}` : n}</span>;
      }
    },
  ];

  const sum = (key) => players.reduce((acc, p) => acc + parseInt(p[key] || 0), 0);
  const summaryRow = {
    personId: '__summary__', uniformNo: '合计', personName: '',
    starterFlag: null, playingFlag: null,
    goalCnt: sum('goalCnt'), shotCnt: sum('shotCnt'),
    threePointGoalCnt: sum('threePointGoalCnt'), threePointShotCnt: sum('threePointShotCnt'),
    freeThrowGoalCnt: sum('freeThrowGoalCnt'), freeThrowShotCnt: sum('freeThrowShotCnt'),
    offenseReboundCnt: sum('offenseReboundCnt'), defenceReboundCnt: sum('defenceReboundCnt'),
    assistCnt: sum('assistCnt'), stealCnt: sum('stealCnt'),
    blockCnt: sum('blockCnt'), turnoverCnt: sum('turnoverCnt'),
    personalFoulCnt: sum('personalFoulCnt'), totalScore: sum('totalScore'),
    _isSummary: true,
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', background: '#f5f5f7',
        borderRadius: '8px 8px 0 0', borderBottom: '2px solid #e5e5ea'
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
      <div className="player-stats-table">
        <Table
          columns={columns}
          dataSource={[...players, summaryRow]}
          rowKey={(r) => r._isSummary ? '__summary__' : (r.personId || r.uniformNo)}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: 960 }}
          rowClassName={r => r._isSummary ? 'player-summary-row' : ''}
          onRow={r => ({
            style: r._isSummary ? { background: '#f0f0f0', fontWeight: 600, borderTop: '2px solid #d9d9d9' } : {}
          })}
        />
      </div>
    </div>
  );
}

// ─── 积分榜组件 ──────────────────────────────────────────────────────────────
function StandingsTable({ tables }) {
  if (!tables) return <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无积分榜数据</div>;

  // tables 可能是对象（含多个分组）或数组
  const renderGroup = (groupName, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const columns = [
      { title: '排名', dataIndex: 'rank', key: 'rank', width: 50, align: 'center', render: v => <span style={{ fontWeight: 700 }}>{v}</span> },
      { title: '球队', dataIndex: 'teamName', key: 'teamName', width: 120, render: v => v || '—' },
      { title: '场次', dataIndex: 'totalMatches', key: 'totalMatches', width: 60, align: 'center', render: v => v ?? '—' },
      { title: '胜', dataIndex: 'wins', key: 'wins', width: 50, align: 'center', render: v => <span style={{ color: '#34c759', fontWeight: 600 }}>{v ?? '—'}</span> },
      { title: '负', dataIndex: 'losses', key: 'losses', width: 50, align: 'center', render: v => <span style={{ color: '#ff3b30', fontWeight: 600 }}>{v ?? '—'}</span> },
      { title: '胜率', dataIndex: 'winRate', key: 'winRate', width: 70, align: 'center', render: v => v ? `${(parseFloat(v) * 100).toFixed(1)}%` : '—' },
      { title: '主场胜', dataIndex: 'homeWins', key: 'homeWins', width: 70, align: 'center', render: (v, r) => r.homeWins !== undefined ? `${r.homeWins}-${r.homeLosses}` : '—' },
      { title: '客场胜', dataIndex: 'awayWins', key: 'awayWins', width: 70, align: 'center', render: (v, r) => r.awayWins !== undefined ? `${r.awayWins}-${r.awayLosses}` : '—' },
    ];
    return (
      <div key={groupName} style={{ marginBottom: 20 }}>
        {groupName && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1d1d1f' }}>{groupName}</div>}
        <Table columns={columns} dataSource={rows} rowKey={(r, i) => i} pagination={false} size="small" />
      </div>
    );
  };

  if (Array.isArray(tables)) {
    return renderGroup('', tables);
  }
  return (
    <div>
      {Object.entries(tables).map(([key, val]) => renderGroup(key, val))}
    </div>
  );
}

// ─── 近期战绩组件 ─────────────────────────────────────────────────────────────
function RecentResults({ matchInfo }) {
  if (!matchInfo) return <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无近期战绩数据</div>;

  const result = matchInfo.result || {};
  const resultDetails = matchInfo.resultDetails || [];

  const renderTeamStats = (label, data, color) => {
    if (!data) return null;
    return (
      <Card size="small" title={<span style={{ color }}>{label}</span>} style={{ marginBottom: 12 }}>
        <Row gutter={16}>
          {data.recentWins !== undefined && (
            <Col span={8}><Statistic title="近期胜" value={data.recentWins} valueStyle={{ color: '#34c759', fontSize: 18 }} /></Col>
          )}
          {data.recentLosses !== undefined && (
            <Col span={8}><Statistic title="近期负" value={data.recentLosses} valueStyle={{ color: '#ff3b30', fontSize: 18 }} /></Col>
          )}
          {data.recentWinRate !== undefined && (
            <Col span={8}><Statistic title="胜率" value={`${(parseFloat(data.recentWinRate || 0) * 100).toFixed(1)}%`} valueStyle={{ fontSize: 18 }} /></Col>
          )}
          {data.avgScore !== undefined && (
            <Col span={8}><Statistic title="场均得分" value={parseFloat(data.avgScore || 0).toFixed(1)} valueStyle={{ fontSize: 18 }} /></Col>
          )}
          {data.avgConcede !== undefined && (
            <Col span={8}><Statistic title="场均失分" value={parseFloat(data.avgConcede || 0).toFixed(1)} valueStyle={{ fontSize: 18 }} /></Col>
          )}
        </Row>
      </Card>
    );
  };

  const detailColumns = [
    { title: '日期', dataIndex: 'matchDate', key: 'matchDate', width: 100 },
    { title: '对阵', key: 'teams', width: 180, render: (_, r) => `${r.awayTeam || ''} vs ${r.homeTeam || ''}` },
    {
      title: '比分', dataIndex: 'fullScore', key: 'fullScore', width: 100, align: 'center',
      render: v => <span style={{ fontWeight: 700 }}>{v || '—'}</span>
    },
    {
      title: '胜负', dataIndex: 'winningTeam', key: 'winningTeam', width: 80, align: 'center',
      render: v => v ? <Tag color="green">{v}</Tag> : '—'
    },
  ];

  return (
    <div style={{ paddingBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>{renderTeamStats('主队近期战绩', result.homeTeamResult, '#0071e3')}</Col>
        <Col xs={24} md={12}>{renderTeamStats('客队近期战绩', result.awayTeamResult, '#e3600b')}</Col>
      </Row>
      {resultDetails.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }}>近期战绩明细</Divider>
          <Table columns={detailColumns} dataSource={resultDetails} rowKey={(r, i) => i} pagination={{ pageSize: 10 }} size="small" />
        </>
      )}
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
  const [playerStatsData, setPlayerStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsMsg, setStatsMsg] = useState('');
  const [activeTab, setActiveTab] = useState('odds');

  const matchDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchMatchInfo();
    fetchOdds();
  }, [matchId]);

  useEffect(() => {
    if (activeTab === 'players' && !playerStatsData && !statsLoading) {
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
        setPlayerStatsData(res.data);
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

  // 赔率列定义
  const oddsColumns = (type) => {
    if (type === 'wnmOddsList') {
      return [
        { title: '主胜1', dataIndex: 'w1', key: 'w1', width: 70, align: 'center' },
        { title: '主胜2', dataIndex: 'w2', key: 'w2', width: 70, align: 'center' },
        { title: '主胜3', dataIndex: 'w3', key: 'w3', width: 70, align: 'center' },
        { title: '主胜4', dataIndex: 'w4', key: 'w4', width: 70, align: 'center' },
        { title: '主胜5', dataIndex: 'w5', key: 'w5', width: 70, align: 'center' },
        { title: '主胜6', dataIndex: 'w6', key: 'w6', width: 70, align: 'center' },
        { title: '客胜1', dataIndex: 'l1', key: 'l1', width: 70, align: 'center' },
        { title: '客胜2', dataIndex: 'l2', key: 'l2', width: 70, align: 'center' },
        { title: '客胜3', dataIndex: 'l3', key: 'l3', width: 70, align: 'center' },
        { title: '客胜4', dataIndex: 'l4', key: 'l4', width: 70, align: 'center' },
        { title: '客胜5', dataIndex: 'l5', key: 'l5', width: 70, align: 'center' },
        { title: '客胜6', dataIndex: 'l6', key: 'l6', width: 70, align: 'center' },
        { title: '更新时间', key: 'time', render: (_, r) => `${r.updateDate || ''} ${r.updateTime || ''}` }
      ];
    }
    if (type === 'hiloOddsList') {
      return [
        { title: '大小分线', dataIndex: 'goalLine', key: 'goalLine', width: 100, render: v => v || '-' },
        { title: '大分赔率', dataIndex: 'h', key: 'h', width: 100, render: v => <span style={{ color: '#0071e3', fontWeight: 600 }}>{v}</span> },
        { title: '小分赔率', dataIndex: 'l', key: 'l', width: 100, render: v => <span style={{ color: '#e3600b', fontWeight: 600 }}>{v}</span> },
        { title: '更新时间', key: 'time', render: (_, r) => `${r.updateDate || ''} ${r.updateTime || ''}` }
      ];
    }
    return [
      { title: '让分/线', dataIndex: 'goalLine', key: 'goalLine', width: 100, render: v => v || '-' },
      { title: '主胜赔率', dataIndex: 'h', key: 'h', width: 100, render: v => <span style={{ color: '#0071e3', fontWeight: 600 }}>{v}</span> },
      { title: '客胜赔率', dataIndex: 'a', key: 'a', width: 100, render: v => <span style={{ color: '#e3600b', fontWeight: 600 }}>{v}</span> },
      { title: '更新时间', key: 'time', render: (_, r) => `${r.updateDate || ''} ${r.updateTime || ''}` }
    ];
  };

  const historyColumns = [
    { title: '日期', dataIndex: 'matchDate', key: 'matchDate', width: 100 },
    { title: '主队', dataIndex: 'homeTeam', key: 'homeTeam', width: 110 },
    { title: '客队', dataIndex: 'awayTeam', key: 'awayTeam', width: 110 },
    { title: '比分', dataIndex: 'score', key: 'score', width: 100, align: 'center', render: v => <span style={{ fontWeight: 700 }}>{v || '—'}</span> },
    {
      title: '结果', dataIndex: 'result', key: 'result', width: 80,
      render: v => {
        const colorMap = { W: 'green', L: 'red', D: 'default' };
        return <Tag color={colorMap[v] || 'default'}>{v}</Tag>;
      }
    }
  ];

  // ── 球员统计 Tab 内容 ──
  const renderPlayerStats = () => {
    if (statsLoading) {
      return <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin tip="加载球员统计中..." /></div>;
    }
    if (!playerStatsData) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ color: '#6e6e73', marginBottom: 16 }}>{statsMsg || '暂无球员统计数据'}</div>
          <Button icon={<ReloadOutlined />} onClick={fetchPlayerStats}>重新获取</Button>
        </div>
      );
    }
    const { playerStats: ps, teamStats: ts, homeScore, awayScore, matchStatusName } = playerStatsData;
    const awayPlayers = Array.isArray(ps?.awayPlayerStats) ? ps.awayPlayerStats : [];
    const homePlayers = Array.isArray(ps?.homePlayerStats) ? ps.homePlayerStats : [];
    const awayName = ps?.awayTeamShortName || ts?.awayTeamShortName || '客队';
    const homeName = ps?.homeTeamShortName || ts?.homeTeamShortName || '主队';
    const awayLogo = ts?.awayTeamLogoPath || '';
    const homeLogo = ts?.homeTeamLogoPath || '';

    return (
      <div style={{ paddingBottom: 16 }}>
        {(homeScore || awayScore) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 32, marginBottom: 20, padding: '14px 20px',
            background: '#f5f5f7', borderRadius: 10
          }}>
            <div style={{ textAlign: 'center' }}>
              {awayLogo && <img src={awayLogo.startsWith('//') ? `https:${awayLogo}` : awayLogo} alt={awayName} style={{ width: 36, height: 36, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} onError={e => { e.target.style.display = 'none'; }} />}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{awayName}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: '#1d1d1f' }}>
                {awayScore} <span style={{ color: '#d2d2d7', fontWeight: 400 }}>:</span> {homeScore}
              </div>
              {matchStatusName && <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{matchStatusName}</div>}
            </div>
            <div style={{ textAlign: 'center' }}>
              {homeLogo && <img src={homeLogo.startsWith('//') ? `https:${homeLogo}` : homeLogo} alt={homeName} style={{ width: 36, height: 36, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} onError={e => { e.target.style.display = 'none'; }} />}
              <div style={{ fontWeight: 600, fontSize: 13 }}>{homeName}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchPlayerStats} loading={statsLoading}>刷新数据</Button>
        </div>
        <PlayerStatsTable players={awayPlayers} teamName={awayName} teamLogoPath={awayLogo} />
        <PlayerStatsTable players={homePlayers} teamName={homeName} teamLogoPath={homeLogo} />
        {(!awayPlayers.length && !homePlayers.length) && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无球员统计数据（比赛可能尚未开始或数据未更新）</div>
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
                          { key: 'hiloOddsList', label: '大小分 (HILO)' },
                          { key: 'wnmOddsList', label: '胜分差 (WNM)' },
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
                                scroll={{ x: 600 }}
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
                    {matchInfo?.historyDetails && matchInfo.historyDetails.length > 0 ? (
                      <>
                        {matchInfo.history && (
                          <Row gutter={16} style={{ marginBottom: 16 }}>
                            <Col span={6}><Statistic title="历史交锋" value={matchInfo.history.totalMatches || 0} suffix="场" /></Col>
                            <Col span={6}><Statistic title="主队胜" value={matchInfo.history.homeTeamWins || 0} valueStyle={{ color: '#0071e3' }} /></Col>
                            <Col span={6}><Statistic title="客队胜" value={matchInfo.history.awayTeamWins || 0} valueStyle={{ color: '#e3600b' }} /></Col>
                            <Col span={6}><Statistic title="平局" value={matchInfo.history.draws || 0} /></Col>
                          </Row>
                        )}
                        <Table
                          columns={historyColumns}
                          dataSource={matchInfo.historyDetails}
                          rowKey={(r, i) => i}
                          pagination={{ pageSize: 10 }}
                          size="small"
                        />
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#6e6e73' }}>暂无历史交锋数据</div>
                    )}
                  </div>
                )
              },
              {
                key: 'recent',
                label: '近期战绩',
                children: <RecentResults matchInfo={matchInfo} />
              },
              {
                key: 'standings',
                label: '积分榜',
                children: (
                  <div style={{ paddingBottom: 16 }}>
                    <StandingsTable tables={matchInfo?.tables} />
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
          <Form.Item label="监控间隔（分钟）" name="interval_minutes" rules={[{ required: true }]}>
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
