import React, { useState } from 'react';
import {
  Card, DatePicker, Spin, Empty, Tag, Table, Button, Space,
  Row, Col, Statistic, Divider, Tooltip, Badge
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, TrophyOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';

const POOL_LABELS = {
  HDC: '胜负',
  HILO: '大小分',
  MNL: '让分胜负',
  WNM: '胜分差',
};

const POOL_COLORS = {
  HDC: 'blue',
  HILO: 'purple',
  MNL: 'cyan',
  WNM: 'orange',
};

export default function ResultsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(3, 'day'));
  const [endDate, setEndDate] = useState(dayjs());
  const [queried, setQueried] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    setQueried(true);
    try {
      const start = startDate.format('YYYY-MM-DD');
      const end = endDate.format('YYYY-MM-DD');
      const res = await request.get(`/matches/results?startDate=${start}&endDate=${end}`);
      if (res.success && res.data?.data) {
        const raw = res.data.data;
        const list = Array.isArray(raw) ? raw : (raw.results || raw.list || []);
        setResults(list);
      } else {
        setResults([]);
      }
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const expandedRowRender = (record) => {
    const oddsResults = record.oddsResults || [];
    if (!oddsResults.length) {
      return <div style={{ color: '#8c8c8c', padding: '8px 0' }}>暂无开奖明细</div>;
    }

    const grouped = {};
    oddsResults.forEach(o => {
      if (!grouped[o.poolCode]) grouped[o.poolCode] = [];
      grouped[o.poolCode].push(o);
    });

    return (
      <div style={{ padding: '8px 16px' }}>
        <Row gutter={16}>
          {Object.entries(grouped).map(([poolCode, items]) => (
            <Col key={poolCode} xs={24} sm={12} md={6} style={{ marginBottom: 12 }}>
              <Card
                size="small"
                title={
                  <Tag color={POOL_COLORS[poolCode] || 'default'}>
                    {POOL_LABELS[poolCode] || poolCode}
                  </Tag>
                }
                styles={{ body: { padding: '8px 12px' } }}
              >
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 0', borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}>
                    <div>
                      <span style={{ fontSize: 12, color: '#1d1d1f' }}>
                        {item.combinationDesc || item.combination}
                      </span>
                      {item.goalLine && (
                        <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 4 }}>
                          ({item.goalLine})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{item.odds}</span>
                      {item.isWin === 1 ? (
                        <CheckCircleOutlined style={{ color: '#34c759', fontSize: 14 }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff3b30', fontSize: 14 }} />
                      )}
                    </div>
                  </div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  const columns = [
    {
      title: '编号',
      dataIndex: 'matchNumStr',
      key: 'matchNumStr',
      width: 90,
      render: v => v || '—',
    },
    {
      title: '比赛日期',
      dataIndex: 'matchDate',
      key: 'matchDate',
      width: 100,
    },
    {
      title: '客队',
      dataIndex: 'allAwayTeam',
      key: 'allAwayTeam',
      width: 130,
      render: v => <span style={{ fontWeight: 600, color: '#e3600b' }}>{v || '—'}</span>,
    },
    {
      title: '比分',
      dataIndex: 'finalScore',
      key: 'finalScore',
      width: 100,
      align: 'center',
      render: v => (
        <span style={{ fontWeight: 800, fontSize: 15, color: '#1d1d1f', letterSpacing: -0.5 }}>
          {v || '—'}
        </span>
      ),
    },
    {
      title: '主队',
      dataIndex: 'allHomeTeam',
      key: 'allHomeTeam',
      width: 130,
      render: v => <span style={{ fontWeight: 600, color: '#0071e3' }}>{v || '—'}</span>,
    },
    {
      title: '开奖玩法',
      key: 'pools',
      render: (_, r) => {
        const pools = [...new Set((r.oddsResults || []).map(o => o.poolCode))];
        return (
          <Space size={4} wrap>
            {pools.map(p => (
              <Tag key={p} color={POOL_COLORS[p] || 'default'} style={{ fontSize: 11 }}>
                {POOL_LABELS[p] || p}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '命中',
      key: 'wins',
      width: 70,
      align: 'center',
      render: (_, r) => {
        const wins = (r.oddsResults || []).filter(o => o.isWin === 1).length;
        const total = (r.oddsResults || []).length;
        return (
          <span style={{ color: wins > 0 ? '#34c759' : '#8c8c8c', fontWeight: 600 }}>
            {wins}/{total}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">开奖结果</div>
            <div className="page-subtitle">赛后开奖信息，含各玩法命中情况</div>
          </div>
          <Space>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              allowClear={false}
              placeholder="开始日期"
              style={{ width: 130 }}
            />
            <span style={{ color: '#8c8c8c' }}>至</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              allowClear={false}
              placeholder="结束日期"
              style={{ width: 130 }}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={fetchResults}
              loading={loading}
            >
              查询
            </Button>
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        {!queried ? (
          <Card>
            <Empty
              image={<TrophyOutlined style={{ fontSize: 48, color: '#d2d2d7' }} />}
              description="请选择日期范围后点击查询"
            />
          </Card>
        ) : results.length === 0 ? (
          <Card>
            <Empty description="该日期范围内暂无开奖数据" />
          </Card>
        ) : (
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>
                  {startDate.format('YYYY-MM-DD')} 至 {endDate.format('YYYY-MM-DD')}
                </span>
                <Tag color="blue">{results.length} 场</Tag>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={columns}
              dataSource={results}
              rowKey={(r, i) => r.matchId || i}
              expandable={{
                expandedRowRender,
                expandRowByClick: false,
              }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              size="small"
            />
          </Card>
        )}
      </Spin>
    </div>
  );
}
