import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Popconfirm, message, DatePicker, Modal, Input, Tooltip, Badge, Row, Col, Statistic } from 'antd';
import { StopOutlined, PlayCircleOutlined, DeleteOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';
import { useNavigate } from 'react-router-dom';

const { RangePicker } = DatePicker;

export default function TaskCenterPage({ onCountChange }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteRange, setDeleteRange] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await request.get('/monitor/tasks');
      if (res.success) {
        setTasks(res.data);
        const running = res.data.filter(t => t.status === 'running').length;
        onCountChange && onCountChange(running);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id) => {
    try {
      const res = await request.put(`/monitor/tasks/${id}/stop`);
      if (res.success) {
        message.success('监控已停止');
        fetchTasks();
      }
    } catch (e) {}
  };

  const handleResume = async (id) => {
    try {
      const res = await request.put(`/monitor/tasks/${id}/resume`);
      if (res.success) {
        message.success('监控已恢复');
        fetchTasks();
      }
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    try {
      const res = await request.delete(`/monitor/tasks/${id}`);
      if (res.success) {
        message.success('任务已删除');
        fetchTasks();
      }
    } catch (e) {}
  };

  const handleBatchDelete = async () => {
    if (!deleteRange || deleteRange.length !== 2) {
      message.warning('请选择日期范围');
      return;
    }
    try {
      const res = await request.delete('/monitor/tasks', {
        data: {
          startDate: deleteRange[0].format('YYYY-MM-DD'),
          endDate: deleteRange[1].format('YYYY-MM-DD')
        }
      });
      if (res.success) {
        message.success(res.message);
        setDeleteRange(null);
        fetchTasks();
      }
    } catch (e) {}
  };

  const handleExport = (id, matchName) => {
    const url = `/api/monitor/tasks/${id}/export`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${matchName}_监控记录.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusTag = (task) => {
    if (task.status === 'running') {
      return (
        <span className="status-badge status-running">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          监控中
        </span>
      );
    }
    if (task.status === 'stopped') {
      return <span className="status-badge status-stopped">已暂停</span>;
    }
    return <span className="status-badge status-finished">已结束</span>;
  };

  const filteredTasks = filterStatus === 'all' ? tasks : tasks.filter(t => t.status === filterStatus);

  const runningCount = tasks.filter(t => t.status === 'running').length;
  const stoppedCount = tasks.filter(t => t.status === 'stopped').length;
  const finishedCount = tasks.filter(t => t.status === 'finished').length;

  const columns = [
    {
      title: '赛事',
      key: 'match',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{record.match_name}</div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>
            {record.match_date} {record.match_time} · ID: {record.match_id}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => getStatusTag(record)
    },
    {
      title: '比赛状态',
      dataIndex: 'match_status',
      key: 'match_status',
      width: 100,
      render: (v) => v ? <Tag>{v}</Tag> : '-'
    },
    {
      title: '间隔',
      dataIndex: 'interval_minutes',
      key: 'interval_minutes',
      width: 80,
      render: (v) => `${v} 分钟`
    },
    {
      title: '记录数',
      dataIndex: 'record_count',
      key: 'record_count',
      width: 80,
      render: (v) => <Badge count={v} showZero color="#6e6e73" overflowCount={9999} />
    },
    {
      title: '最后查询',
      dataIndex: 'last_queried_at',
      key: 'last_queried_at',
      width: 160,
      render: (v) => v ? dayjs(v).format('MM-DD HH:mm:ss') : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/monitor/${record.id}`)}
            />
          </Tooltip>
          {record.status === 'running' && (
            <Tooltip title="停止监控">
              <Popconfirm title="确认停止监控？" onConfirm={() => handleStop(record.id)}>
                <Button size="small" icon={<StopOutlined />} danger />
              </Popconfirm>
            </Tooltip>
          )}
          {record.status === 'stopped' && (
            <Tooltip title="继续监控">
              <Button
                size="small"
                icon={<PlayCircleOutlined />}
                type="primary"
                onClick={() => handleResume(record.id)}
              />
            </Tooltip>
          )}
          <Tooltip title="导出 Excel">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleExport(record.id, record.match_name)}
            />
          </Tooltip>
          <Tooltip title="删除任务">
            <Popconfirm title="确认删除此任务及所有记录？" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">任务中心</div>
            <div className="page-subtitle">管理所有赛事监控任务，查看历史记录并导出数据</div>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>刷新</Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="监控中"
              value={runningCount}
              valueStyle={{ color: '#34c759', fontSize: 28 }}
              prefix={<span className="live-dot" style={{ marginRight: 6 }} />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="已暂停"
              value={stoppedCount}
              valueStyle={{ color: '#ff9f0a', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title="已结束"
              value={finishedCount}
              valueStyle={{ color: '#6e6e73', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 批量删除 */}
      <Card style={{ marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#6e6e73', whiteSpace: 'nowrap' }}>按日期批量删除：</span>
          <RangePicker
            value={deleteRange}
            onChange={setDeleteRange}
            style={{ flex: 1, maxWidth: 300 }}
          />
          <Popconfirm
            title="确认删除所选日期范围内的所有任务？"
            onConfirm={handleBatchDelete}
            disabled={!deleteRange}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!deleteRange}>
              批量删除
            </Button>
          </Popconfirm>
        </div>
      </Card>

      {/* 筛选 */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        {[
          { key: 'all', label: '全部' },
          { key: 'running', label: '监控中' },
          { key: 'stopped', label: '已暂停' },
          { key: 'finished', label: '已结束' }
        ].map(item => (
          <Button
            key={item.key}
            size="small"
            type={filterStatus === item.key ? 'primary' : 'default'}
            onClick={() => setFilterStatus(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* 任务列表 */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}
