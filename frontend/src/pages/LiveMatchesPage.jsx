import React, { useState, useEffect } from 'react';
import { Card, Button, DatePicker, Spin, Empty, Tag, Modal, Form, InputNumber, message, Tooltip, Space, Row, Col, Divider } from 'antd';
import { PlayCircleOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';
import { useNavigate } from 'react-router-dom';

const STATUS_MAP = {
  '0': { color: 'default', text: '未开始' },
  '1': { color: 'processing', text: '第一节' },
  '2': { color: 'processing', text: '第二节' },
  '3': { color: 'processing', text: '第三节' },
  '4': { color: 'processing', text: '第四节' },
  '5': { color: 'warning', text: '加时' },
  '6': { color: 'success', text: '已结束' },
  '7': { color: 'default', text: '已结束' },
  '8': { color: 'default', text: '已结束' },
};

export default function LiveMatchesPage() {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [monitorModal, setMonitorModal] = useState({ visible: false, match: null });
  const [monitorForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveMatches();
  }, [selectedDate]);

  const fetchLiveMatches = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const res = await request.get(`/matches/live?date=${dateStr}`);
      if (res.success && res.data?.data?.matches) {
        setMatches(res.data.data.matches);
      } else {
        setMatches([]);
      }
    } catch (e) {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const openMonitorModal = (match) => {
    setMonitorModal({ visible: true, match });
    monitorForm.setFieldsValue({ interval_minutes: 5 });
  };

  const handleStartMonitor = async (values) => {
    const { match } = monitorModal;
    if (!match) return;

    setSubmitting(true);
    try {
      const matchInfo = match.matchInfo || {};
      const res = await request.post('/monitor/tasks', {
        match_id: match.matchId,
        match_name: `${matchInfo.awayTeamAllName || matchInfo.awayTeamAbbName} vs ${matchInfo.homeTeamAllName || matchInfo.homeTeamAbbName}`,
        home_team: matchInfo.homeTeamAllName || matchInfo.homeTeamAbbName,
        away_team: matchInfo.awayTeamAllName || matchInfo.awayTeamAbbName,
        match_date: selectedDate.format('YYYY-MM-DD'),
        interval_minutes: values.interval_minutes
      });

      if (res.success) {
        message.success('监控任务已创建！');
        setMonitorModal({ visible: false, match: null });
        navigate(`/monitor/${res.data.id}`);
      }
    } catch (e) {
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusInfo = (match) => {
    const status = match.matchInfo?.matchStatus || '0';
    return STATUS_MAP[status] || { color: 'default', text: match.matchInfo?.matchStatusName || '未知' };
  };

  const isLive = (match) => {
    const status = match.matchInfo?.matchStatus;
    return ['1', '2', '3', '4', '5'].includes(status);
  };

  const isEnded = (match) => {
    const status = match.matchInfo?.matchStatus;
    return ['6', '7', '8'].includes(status);
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">直播赛事</div>
            <div className="page-subtitle">查看当日篮球比赛实时战况，点击赛事可开启监控</div>
          </div>
          <Space>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              allowClear={false}
              size="large"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchLiveMatches}
              loading={loading}
              size="large"
            >
              刷新
            </Button>
          </Space>
        </div>
      </div>

      <Spin spinning={loading}>
        {matches.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={`${selectedDate.format('YYYY-MM-DD')} 暂无赛事数据`}
            style={{ marginTop: 80 }}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {matches.map((match) => {
              const matchInfo = match.matchInfo || {};
              const statusInfo = getStatusInfo(match);
              const live = isLive(match);
              const ended = isEnded(match);

              // 解析比分
              let homeScore = '-', awayScore = '-';
              if (matchInfo.sectionsNo999) {
                const scores = matchInfo.sectionsNo999.split(':');
                awayScore = scores[0] || '-';
                homeScore = scores[1] || '-';
              }

              // 解析各节比分
              let sections = [];
              try {
                sections = JSON.parse(matchInfo.sectionsNos || '[]');
              } catch (e) {}

              return (
                <Col xs={24} sm={12} lg={8} key={match.matchId}>
                  <div
                    className="match-card"
                    onClick={() => navigate(`/match/${match.matchId}?date=${selectedDate.format('YYYY-MM-DD')}`)}
                  >
                    {/* 状态栏 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {live && <span className="live-dot" />}
                        <Tag color={statusInfo.color} style={{ margin: 0 }}>
                          {matchInfo.matchStatusName || statusInfo.text}
                        </Tag>
                      </div>
                      {matchInfo.matchMinute && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6e6e73', fontSize: 12 }}>
                          <ClockCircleOutlined />
                          {matchInfo.matchMinute}'
                        </div>
                      )}
                    </div>

                    {/* 比分区域 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      {/* 客队 */}
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="team-name">{matchInfo.awayTeamAbbName}</div>
                        <div className="score-display">{awayScore}</div>
                        <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2 }}>客队</div>
                      </div>

                      {/* VS */}
                      <div style={{ textAlign: 'center', padding: '0 12px' }}>
                        <div style={{ fontSize: 12, color: '#6e6e73', fontWeight: 600 }}>VS</div>
                      </div>

                      {/* 主队 */}
                      <div style={{ textAlign: 'center', flex: 1 }}>
                        <div className="team-name">{matchInfo.homeTeamAbbName}</div>
                        <div className="score-display">{homeScore}</div>
                        <div style={{ fontSize: 10, color: '#6e6e73', marginTop: 2 }}>主队</div>
                      </div>
                    </div>

                    {/* 各节比分 */}
                    {sections.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {sections.map((s) => (
                            <span key={s.sectionNo} className="section-score">
                              {s.sectionNo === -1 ? 'OT' : `Q${s.sectionNo}`}: {s.score}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Divider style={{ margin: '12px 0' }} />

                    {/* 操作按钮 */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/match/${match.matchId}?date=${selectedDate.format('YYYY-MM-DD')}`);
                        }}
                      >
                        详情
                      </Button>
                      {!ended && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openMonitorModal(match);
                          }}
                        >
                          开始监控
                        </Button>
                      )}
                      {ended && (
                        <Tag color="default">赛事已结束</Tag>
                      )}
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      {/* 监控设置弹窗 */}
      <Modal
        title="设置监控参数"
        open={monitorModal.visible}
        onCancel={() => setMonitorModal({ visible: false, match: null })}
        footer={null}
      >
        {monitorModal.match && (
          <div>
            <div style={{
              background: '#f5f5f7',
              borderRadius: 10,
              padding: '14px 16px',
              marginBottom: 20
            }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {monitorModal.match.matchInfo?.awayTeamAllName} vs {monitorModal.match.matchInfo?.homeTeamAllName}
              </div>
              <div style={{ fontSize: 12, color: '#6e6e73' }}>
                赛事 ID: {monitorModal.match.matchId}
              </div>
            </div>

            <Form form={monitorForm} onFinish={handleStartMonitor} layout="vertical">
              <Form.Item
                label="监控间隔（分钟）"
                name="interval_minutes"
                rules={[{ required: true, message: '请设置监控间隔' }]}
                extra="每隔指定分钟自动查询一次比赛数据并记录"
              >
                <InputNumber
                  min={1}
                  max={60}
                  style={{ width: '100%' }}
                  size="large"
                  addonAfter="分钟"
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                  size="large"
                  icon={<PlayCircleOutlined />}
                >
                  开始监控
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
