import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Badge, ConfigProvider } from 'antd';
import {
  SettingOutlined,
  PlayCircleOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import ConfigPage from './pages/ConfigPage';
import LiveMatchesPage from './pages/LiveMatchesPage';
import MonitorPage from './pages/MonitorPage';
import TaskCenterPage from './pages/TaskCenterPage';
import MatchDetailPage from './pages/MatchDetailPage';
import request from './utils/request';

const { Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '/config', icon: <SettingOutlined />, label: 'API 配置' },
  { key: '/live', icon: <PlayCircleOutlined />, label: '直播赛事' },
  { key: '/tasks', icon: <UnorderedListOutlined />, label: '任务中心' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hasConfig, setHasConfig] = useState(false);
  const [runningCount, setRunningCount] = useState(0);

  useEffect(() => {
    checkConfig();
    fetchRunningCount();
    const interval = setInterval(fetchRunningCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConfig = async () => {
    try {
      const res = await request.get('/config');
      setHasConfig(!!res.data);
    } catch (e) {}
  };

  const fetchRunningCount = async () => {
    try {
      const res = await request.get('/monitor/tasks');
      if (res.success) {
        const running = res.data.filter(t => t.status === 'running').length;
        setRunningCount(running);
      }
    } catch (e) {}
  };

  const selectedKey = '/' + location.pathname.split('/')[1] || '/config';

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#0071e3',
          borderRadius: 8,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', 'PingFang SC', sans-serif"
        }
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={220}
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid #d2d2d7',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            zIndex: 100
          }}
        >
          {/* Logo */}
          <div style={{
            padding: '24px 20px 20px',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #0071e3, #00a3ff)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}>🏀</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2 }}>NBA Monitor</div>
                <div style={{ fontSize: 11, color: '#6e6e73' }}>体育信息监控 v2.0.0</div>
              </div>
            </div>
          </div>

          {/* 菜单 */}
          <Menu
            mode="inline"
            selectedKeys={[selectedKey.startsWith('/monitor') ? '/tasks' : selectedKey]}
            style={{ marginTop: 8, border: 'none', background: 'transparent' }}
            onClick={({ key }) => navigate(key)}
            items={menuItems.map(item => ({
              ...item,
              label: item.key === '/tasks' && runningCount > 0
                ? <span>{item.label} <Badge count={runningCount} size="small" style={{ marginLeft: 4 }} /></span>
                : item.label
            }))}
          />

          {/* 底部状态 */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 0,
            right: 0,
            padding: '0 20px'
          }}>
            <div style={{
              padding: '10px 14px',
              background: hasConfig ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)',
              borderRadius: 8,
              fontSize: 12
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: hasConfig ? '#34c759' : '#ff3b30'
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'currentColor',
                  display: 'inline-block'
                }} />
                {hasConfig ? 'API 已配置' : 'API 未配置'}
              </div>
            </div>
          </div>
        </Sider>

        <Layout style={{ marginLeft: 220 }}>
          <Content style={{ padding: '0 32px 32px', minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<ConfigPage onConfigSaved={() => setHasConfig(true)} />} />
              <Route path="/config" element={<ConfigPage onConfigSaved={() => setHasConfig(true)} />} />
              <Route path="/live" element={<LiveMatchesPage />} />
              <Route path="/tasks" element={<TaskCenterPage onCountChange={setRunningCount} />} />
              <Route path="/monitor/:taskId" element={<MonitorPage />} />
              <Route path="/match/:matchId" element={<MatchDetailPage />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
