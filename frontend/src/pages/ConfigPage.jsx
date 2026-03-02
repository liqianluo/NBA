import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Alert, Divider, Typography, Space, Tag } from 'antd';
import { SaveOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import request from '../utils/request';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function ConfigPage({ onConfigSaved }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await request.get('/config');
      if (res.data) {
        form.setFieldsValue({
          base_url: res.data.base_url,
          api_key: res.data.api_key,
          private_key: '（已保存，如需修改请重新输入）'
        });
        setHasConfig(true);
      }
    } catch (e) {}
  };

  const handleSave = async (values) => {
    if (values.private_key === '（已保存，如需修改请重新输入）') {
      message.warning('私钥未修改，无需重新保存');
      return;
    }
    setLoading(true);
    try {
      const res = await request.post('/config', values);
      if (res.success) {
        message.success('配置保存成功');
        setHasConfig(true);
        onConfigSaved && onConfigSaved();
        // 自动 Ping 测试
        handlePing();
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await request.post('/config/ping');
      if (res.success) {
        setPingResult({ success: true, data: res.data });
        message.success('API 连接测试成功！');
      }
    } catch (e) {
      setPingResult({ success: false, message: e.response?.data?.message || '连接失败' });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">API 配置</div>
        <div className="page-subtitle">配置 FiroApi 接口信息，保存后自动验证连接</div>
      </div>

      <div style={{ maxWidth: 700 }}>
        <Card
          style={{ marginBottom: 20 }}
          styles={{ body: { padding: '28px 32px' } }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            initialValues={{
              base_url: 'http://8.140.242.189:7006'
            }}
          >
            <Form.Item
              label={<span style={{ fontWeight: 600 }}>API 请求路径（前缀）</span>}
              name="base_url"
              rules={[{ required: true, message: '请输入 API 请求路径' }]}
              extra="例如：http://8.140.242.189:7006"
            >
              <Input
                prefix={<ApiOutlined style={{ color: '#6e6e73' }} />}
                placeholder="http://8.140.242.189:7006"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>API Key</span>}
              name="api_key"
              rules={[{ required: true, message: '请输入 API Key' }]}
            >
              <Input
                placeholder="请输入 API Key"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 600 }}>Private Key（Base64 格式）</span>}
              name="private_key"
              rules={[{ required: true, message: '请输入 Private Key' }]}
              extra="用于生成请求签名（SHA256withRSA），PKCS#8 DER 格式的 Base64 编码私钥"
            >
              <TextArea
                rows={4}
                placeholder="请输入 Private Key（Base64 格式）"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SaveOutlined />}
                  size="large"
                >
                  保存配置
                </Button>
                {hasConfig && (
                  <Button
                    onClick={handlePing}
                    loading={pinging}
                    icon={<ApiOutlined />}
                    size="large"
                  >
                    测试连接
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* Ping 结果 */}
        {pingResult && (
          <Card styles={{ body: { padding: '20px 24px' } }}>
            {pingResult.success ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CheckCircleOutlined style={{ color: '#34c759', fontSize: 18 }} />
                  <span style={{ fontWeight: 600, color: '#34c759' }}>API 连接成功</span>
                </div>
                {pingResult.data && (
                  <div style={{ background: '#f5f5f7', borderRadius: 8, padding: '12px 16px' }}>
                    <Text style={{ fontSize: 12, color: '#6e6e73', display: 'block', marginBottom: 4 }}>接口返回数据</Text>
                    <pre style={{ fontSize: 12, margin: 0, color: '#1d1d1f', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(pingResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CloseCircleOutlined style={{ color: '#ff3b30', fontSize: 18 }} />
                <span style={{ color: '#ff3b30' }}>连接失败：{pingResult.message}</span>
              </div>
            )}
          </Card>
        )}

        {/* 说明 */}
        <Card
          title="签名说明"
          style={{ marginTop: 20 }}
          styles={{ body: { padding: '16px 24px' } }}
        >
          <div style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">签名算法</Tag> RSA-SHA256 (SHA256withRSA)
            </div>
            <div style={{ marginBottom: 8 }}>
              <Tag color="blue">签名格式</Tag> apiKey={'{apiKey}'}&timestamp={'{timestamp}'}&{'{排序后的参数}'}
            </div>
            <div style={{ marginBottom: 8 }}>
              <Tag color="orange">注意</Tag> 时间戳有效期为 5 分钟，超时请求会被拒绝
            </div>
            <div>
              <Tag color="orange">注意</Tag> 私钥需为 PKCS#8 格式的 DER 编码（Base64）
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
