require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { dbReady } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/config', require('./routes/config'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/monitor', require('./routes/monitor'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NBA Monitor API is running', version: '1.0.0' });
});

// 静态文件服务（前端构建产物）
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误: ' + err.message });
});

// 等待数据库就绪后再启动 HTTP 服务
dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NBA Monitor Server running on port ${PORT}`);
      // 恢复运行中的监控任务
      try {
        const monitorService = require('./services/monitorService');
        monitorService.restoreRunningTasks();
      } catch (error) {
        console.error('Failed to restore tasks:', error.message);
      }
    });
  })
  .catch((err) => {
    console.error('[FATAL] 数据库初始化失败，服务无法启动:', err.message);
    process.exit(1);
  });

module.exports = app;
