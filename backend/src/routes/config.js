const express = require('express');
const router = express.Router();
const db = require('../models/dbAdapter');
const apiService = require('../services/apiService');

// 获取当前配置
router.get('/', async (req, res) => {
  try {
    const config = await db.get(
      'SELECT id, base_url, api_key, created_at, updated_at FROM api_config ORDER BY id DESC LIMIT 1'
    );
    res.json({ success: true, data: config || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存配置
router.post('/', async (req, res) => {
  try {
    const { base_url, api_key, private_key } = req.body;
    if (!base_url || !api_key || !private_key) {
      return res.status(400).json({ success: false, message: '请填写完整的配置信息' });
    }

    const existing = await db.get('SELECT id FROM api_config LIMIT 1');
    if (existing) {
      await db.run(
        'UPDATE api_config SET base_url = ?, api_key = ?, private_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [base_url.trim(), api_key.trim(), private_key.trim(), existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO api_config (base_url, api_key, private_key) VALUES (?, ?, ?)',
        [base_url.trim(), api_key.trim(), private_key.trim()]
      );
    }

    res.json({ success: true, message: '配置保存成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ping 测试
router.post('/ping', async (req, res) => {
  try {
    const result = await apiService.ping();
    res.json({ success: true, data: result, message: 'API 连接正常' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'API 连接失败: ' + error.message });
  }
});

module.exports = router;
