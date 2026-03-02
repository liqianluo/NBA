# NBA 体育信息监控系统

> 基于 Node.js + SQLite/MySQL 的篮球赛事个性化信息获取与监控平台，采用 Apple 风格 UI 设计。

## 功能特性

- **API 配置**：支持配置 FiroApi 接口信息（请求路径、API Key、Private Key），保存后自动 Ping 验证连接
- **直播赛事**：查看指定日期的篮球赛事列表，包含实时比分、各节比分、比赛状态
- **赛事监控**：对指定赛事开启定时监控（按分钟设定间隔），自动查询并记录每次数据
- **球员统计**：实时获取比赛球员统计数据（得分、篮板、助攻、抢断、盖帽、失误等）
- **球队统计**：实时获取球队整体统计数据
- **赔率信息**：查看赛事赔率（HDC 胜负、MNL 让分胜负、WNM 胜分差、HILO 大小分）
- **历史交锋**：查看赛事历史交锋记录
- **任务中心**：管理所有监控任务，支持继续/停止监控、按日期范围批量删除
- **Excel 导出**：每个监控任务支持导出完整历史记录（含球员统计）到 Excel

## 技术栈

| 层次 | 技术 |
|------|------|
| 后端框架 | Node.js + Express 5 |
| 数据库 | MySQL 5.7+ |
| 定时任务 | node-cron |
| HTTP 请求 | axios |
| Excel 导出 | exceljs |
| 前端框架 | React 19 + Vite |
| UI 组件库 | Ant Design 6 |
| 路由 | React Router 7 |

## 部署

- [CentOS 部署教程](./DEPLOY_CENTOS.md)

## 快速开始（本地开发）

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 构建前端

```bash
cd frontend
npm run build
```

### 3. 启动服务

```bash
cd backend
npm start
```

服务启动后访问 `http://localhost:3001`

### 4. 配置 API

在 **API 配置** 页面填入：
- **API 请求路径（前缀）**：`http://8.140.242.189:7006`
- **API Key**：您的 API Key
- **Private Key**：PKCS#8 DER 格式的 Base64 编码私钥

保存后系统自动 Ping 验证连接。

## 项目结构

```
NBA/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── app.js             # 主入口
│   │   ├── models/
│   │   │   └── database.js    # SQLite 数据库初始化
│   │   ├── routes/
│   │   │   ├── config.js      # API 配置路由
│   │   │   ├── matches.js     # 赛事查询路由
│   │   │   └── monitor.js     # 监控任务路由（含 Excel 导出）
│   │   ├── services/
│   │   │   ├── apiService.js  # FiroApi 请求封装
│   │   │   └── monitorService.js # 定时监控服务
│   │   └── utils/
│   │       └── signature.js   # RSA-SHA256 签名工具
│   └── data/                  # SQLite 数据库文件（运行时生成）
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── App.jsx            # 主应用组件
│   │   ├── pages/
│   │   │   ├── ConfigPage.jsx       # API 配置页
│   │   │   ├── LiveMatchesPage.jsx  # 直播赛事页
│   │   │   ├── MonitorPage.jsx      # 监控详情页
│   │   │   ├── TaskCenterPage.jsx   # 任务中心页
│   │   │   └── MatchDetailPage.jsx  # 赛事详情页
│   │   └── utils/
│   │       └── request.js     # axios 请求封装
│   └── dist/                  # 构建产物（npm run build 后生成）
└── README.md
```

## API 签名说明

本系统使用 **RSA-SHA256** 签名算法（SHA256withRSA）：

1. 待签名字符串格式：`apiKey={apiKey}&timestamp={timestamp}&{排序后的参数}`
2. 参数按字母顺序排序后拼接
3. 使用 PKCS#8 格式私钥进行签名，Base64 编码后放入请求头 `X-Signature`
4. 时间戳有效期为 5 分钟

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `api_config` | API 配置信息 |
| `monitor_tasks` | 监控任务列表 |
| `monitor_records` | 每次查询的历史记录（含比分、球员统计） |
| `schedule_records` | 赛程查询记录 |

## 版本历史

### v1.0.0 (2026-03-03)
- 初始版本发布
- 实现 API 配置、Ping 测试功能
- 实现直播赛事列表查询
- 实现赛事监控（定时查询、历史记录）
- 实现球员统计、球队统计数据展示
- 实现赔率信息、历史交锋查询
- 实现任务中心（创建/停止/继续/删除任务）
- 实现按日期范围批量删除任务
- 实现 Excel 导出（含球员统计 Sheet）
- Apple 风格 UI 设计

## License

MIT
