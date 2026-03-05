import React, { useState, useEffect } from 'react';
import {
  Card, Spin, Empty, Tag, Table, Button, Space, Badge
} from 'antd';
import { ReloadOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';

const POOL_LABELS = {
  HDC: '胜负',
  HILO: '大小分',
  MNL: '让分胜负',
  WNM: '胜分差',
};

const STATUS_COLORS = {
  Selling: 'processing',
  SoldOut: 'warning',
  Closed: 'default',
};
const STATUS_LABELS = {
  Selling: '销售中',
  SoldOut: '已截止',
  Closed: '已关闭',
};

export default function SchedulePage() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const today = dayjs().format('YYYY年MM月DD日');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      // 注意：竞蓝赛程接口不支持按日期查询，只返回今日未开赛赛程
      const res = await request.get('/matches/schedule');
      if (res.success && res.data) {
        const raw = res.data;
        // API 返回结构：{ code, data: [...] } 或 { data: { data: [...] } }
        let list = [];
        if (Array.isArray(raw.data)) {
          list = raw.data;
        } else if (raw.data && Array.isArray(raw.data.data)) {
          list = raw.data.data;
        } else if (Array.isArray(raw)) {
          list = raw;
        }
        setMatches(list);
      } else {
        setMatches([]);
        if (!res.success) setError(res.message || '请求失败');
      }
    } catch (e) {
      setMatches([]);
      setError(e.message || '请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getOddsByPool = (match, poolCode) => {
    const odds = match.oddsList || [];
    return odds.filter(o => o.poolCode === poolCode);
  };

  const renderOddsCell = (match, poolCode) => {
    const list = getOddsByPool(match, poolCode);
    if (!list.length) return <span style={{ color: '#bbb' }}>—</span>;
    return (
      <div>
        {list.map((o, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.8 }}>
            {o.goalLine && <span style={{ color: '#8c8c8c', marginRight: 4 }}>{o.goalLine}</span>}
            <span style={{ color: '#0071e3', fontWeight: 600 }}>{o.homeOdds}</span>
            <span style={{ color: '#8c8c8c', margin: '0 4px' }}>|</span>
            <span style={{ color: '#e3600b', fontWeight: 600 }}>{o.awayOdds}</span>
          </div>
        ))}
      </div>
    );
  };

  const columns = [
    {
      title: '编号',
      dataIndex: ['matchInfo', 'matchNumStr'],
      key: 'matchNumStr',
      width: 80,
      render: (v, r) => v || r.matchInfo?.matchNum || '—',
    },
    {
      title: '时间',
      key: 'time',
      width: 70,
      render: (_, r) => r.matchInfo?.matchTime || '—',
    },
    {
      title: '联赛',
      key: 'league',
      width: 90,
      render: (_, r) => (
        <Tag color="blue" style={{ fontSize: 11 }}>
          {r.matchInfo?.leagueName || 'NBA'}
        </Tag>
      ),
    },
    {
      title: '客队',
      key: 'away',
      width: 120,
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#e3600b' }}>
          {r.matchInfo?.awayTeamName || r.matchInfo?.awayTeamAbbName || '—'}
        </span>
      ),
    },
    {
      title: '主队',
      key: 'home',
      width: 120,
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#0071e3' }}>
          {r.matchInfo?.homeTeamName || r.matchInfo?.homeTeamAbbName || '—'}
        </span>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_, r) => {
        const s = r.matchInfo?.matchStatus || '';
        return (
          <Badge
            status={STATUS_COLORS[s] || 'default'}
            text={STATUS_LABELS[s] || s || '未知'}
          />
        );
      },
    },
    {
      title: '胜负 (HDC)',
      key: 'hdc',
      width: 130,
      render: (_, r) => renderOddsCell(r, 'HDC'),
    },
    {
      title: '大小分 (HILO)',
      key: 'hilo',
      width: 130,
      render: (_, r) => renderOddsCell(r, 'HILO'),
    },
    {
      title: '让分胜负 (MNL)',
      key: 'mnl',
      width: 130,
      render: (_, r) => renderOddsCell(r, 'MNL'),
    },
    {
      title: '玩法',
      key: 'pools',
      width: 160,
      render: (_, r) => {
        const pools = r.poolList || [];
        return (
          <Space size={4} wrap>
            {pools.map((p, i) => (
              <Tag
                key={i}
                color={p.poolStatus === 'Selling' ? 'green' : 'default'}
                style={{ fontSize: 10, padding: '0 4px' }}
              >
                {POOL_LABELS[p.poolCode] || p.poolCode}
              </Tag>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">竞蓝赛程</div>
            <div className="page-subtitle">今日未开赛赛事列表，含实时赔率</div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSchedule} loading={loading}>
              刷新
            </Button>
          </Space>
        </div>
      </div>

      {error && (
        <Card style={{ marginBottom: 16, borderColor: '#ff4d4f' }}>
          <span style={{ color: '#ff4d4f' }}>⚠ {error}</span>
        </Card>
      )}

      <Spin spinning={loading}>
        {matches.length === 0 && !loading ? (
          <Card>
            <Empty description="今日暂无竞蓝赛程数据" />
          </Card>
        ) : (
          <Card
            title={
              <Space>
                <CalendarOutlined />
                <span>{today}</span>
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
              scroll={{ x: 1100 }}
              size="small"
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}
