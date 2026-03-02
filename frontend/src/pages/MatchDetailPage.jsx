import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Descriptions, Spin, Button, Tag, Row, Col, Statistic, message, Modal, Form, InputNumber } from 'antd';
import { ArrowLeftOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import request from '../utils/request';

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
  const matchDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchMatchInfo();
    fetchOdds();
  }, [matchId]);

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
            onClick={() => { setMonitorModal(true); monitorForm.setFieldsValue({ interval_minutes: 5 }); }}
          >
            开始监控
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <Card styles={{ body: { padding: 0 } }}>
          <Tabs
            defaultActiveKey="odds"
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
