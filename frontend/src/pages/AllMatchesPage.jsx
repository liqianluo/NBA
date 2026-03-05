import React, { useState, useEffect } from 'react';
import {
  Card, DatePicker, Spin, Empty, Tag, Table, Button, Space,
  Badge, Tooltip, Row, Col
} from 'antd';
import {
  ReloadOutlined, CalendarOutlined, EyeOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import request from '../utils/request';

const MATCH_STATUS_MAP = {
  Selling: { color: 'processing', text: '销售中' },
  SoldOut: { color: 'warning', text: '已截止' },
  Closed: { color: 'default', text: '已关闭' },
  Finished: { color: 'success', text: '已结束' },
};

export default function AllMatchesPage() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllMatches();
  }, [selectedDate]);

  const fetchAllMatches = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const res = await request.get(`/matches/all-list?date=${dateStr}`);
      if (res.success && res.data?.data) {
        const raw = res.data.data;
        const list = Array.isArray(raw) ? raw : (raw.matches || raw.list || []);
        setMatches(list);
      } else {
        setMatches([]);
      }
    } catch (e) {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getOddsDisplay = (match, poolCode) => {
    const odds = match.oddsList || [];
    const list = odds.filter(o => o.poolCode === poolCode);
    if (!list.length) return null;
    const o = list[0];
    return (
      <div style={{ fontSize: 11 }}>
        {o.goalLine && <span style={{ color: '#8c8c8c' }}>{o.goalLine} </span>}
        <span style={{ color: '#0071e3', fontWeight: 600 }}>{o.homeOdds}</span>
        <span style={{ color: '#8c8c8c', margin: '0 2px' }}>|</span>
        <span style={{ color: '#e3600b', fontWeight: 600 }}>{o.awayOdds}</span>
      </div>
    );
  };

  const columns = [
    {
      title: '编号',
      key: 'num',
      width: 80,
      render: (_, r) => r.matchInfo?.matchNumStr || r.matchInfo?.matchNum || '—',
    },
    {
      title: '日期/时间',
      key: 'datetime',
      width: 100,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{r.matchInfo?.matchDate || '—'}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.matchInfo?.matchTime || ''}</div>
        </div>
      ),
    },
    {
      title: '联赛',
      key: 'league',
      width: 70,
      render: (_, r) => (
        <Tag color="blue" style={{ fontSize: 10 }}>
          {r.matchInfo?.leagueName || 'NBA'}
        </Tag>
      ),
    },
    {
      title: '客队',
      key: 'away',
      width: 110,
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#e3600b' }}>
          {r.matchInfo?.awayTeamName || r.matchInfo?.awayTeamAbbName || '—'}
        </span>
      ),
    },
    {
      title: '主队',
      key: 'home',
      width: 110,
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#0071e3' }}>
          {r.matchInfo?.homeTeamName || r.matchInfo?.homeTeamAbbName || '—'}
        </span>
      ),
    },
    {
      title: '赛事状态',
      key: 'status',
      width: 90,
      render: (_, r) => {
        const s = r.matchInfo?.matchStatus || '';
        const info = MATCH_STATUS_MAP[s] || { color: 'default', text: s || '未知' };
        return <Badge status={info.color} text={info.text} />;
      },
    },
    {
      title: '胜负 (HDC)',
      key: 'hdc',
      width: 120,
      render: (_, r) => getOddsDisplay(r, 'HDC') || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: '大小分 (HILO)',
      key: 'hilo',
      width: 120,
      render: (_, r) => getOddsDisplay(r, 'HILO') || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: '让分胜负 (MNL)',
      key: 'mnl',
      width: 120,
      render: (_, r) => getOddsDisplay(r, 'MNL') || <span style={{ color: '#bbb' }}>—</span>,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, r) => {
        const matchId = r.matchInfo?.matchId;
        const date = r.matchInfo?.matchDate || selectedDate.format('YYYY-MM-DD');
        if (!matchId) return null;
        return (
          <Tooltip title="查看赛事详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/match/${matchId}?date=${date}`)}
            >
              详情
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">全部赛事</div>
            <div className="page-subtitle">指定日期全部竞蓝赛事（含已开赛/已结束），含赔率信息</div>
          </div>
          <Space>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              allowClear={false}
              style={{ width: 140 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchAllMatches} loading={loading}>
              刷新
            </Button>
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        {matches.length === 0 && !loading ? (
          <Card>
            <Empty description={`${selectedDate.format('YYYY-MM-DD')} 暂无赛事数据`} />
          </Card>
        ) : (
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>{selectedDate.format('YYYY年MM月DD日')} 全部赛事</span>
                <Tag color="blue">{matches.length} 场</Tag>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={columns}
              dataSource={matches}
              rowKey={(r, i) => r.matchInfo?.matchId || i}
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 1000 }}
              size="small"
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}
