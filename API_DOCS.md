# FiroApi 接口文档整理

> 接口文档地址：http://8.140.242.189:7005/
> API 服务地址：http://8.140.242.189:7006/
> 调用量：总计 100 次，已用 42 次，**剩余 58 次**

---

## 认证方式

所有接口均需在请求头中携带以下字段：

| 请求头 | 说明 |
|--------|------|
| `X-API-Key` | 你的 apiKey |
| `X-Signature` | RSA-SHA256 签名字符串（详见请求示例） |
| `X-Timestamp` | 当前时间戳（毫秒） |

签名规则：待签名字符串格式为 `apiKey={apiKey}&timestamp={timestamp}&{排序后的参数}`，使用 PKCS#8 格式私钥进行签名，Base64 编码后放入 `X-Signature`。

---

## 体育 API 接口列表

### 1. 篮球文字战况直播

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/bb-text/live` |
| **本地路由** | `GET /api/matches/live?date=yyyy-MM-dd` |
| **描述** | 查询当日全部篮球比赛战况信息，包含比赛基本信息、各节比分、球队数据统计、球员数据统计，可查询正在进行的实时比赛战况 |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `date` | String | 是 | 日期，格式 `yyyy-MM-dd`，例如 `2026-02-28` |

**响应字段（matchInfo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `matchId` | Integer | 赛事ID |
| `awayTeamAbbName` | String | 客队简称 |
| `homeTeamAbbName` | String | 主队简称 |
| `matchStatus` | String | 比赛状态代码 |
| `matchStatusName` | String | 比赛状态名称（如：直播结束） |
| `matchPhaseTc` | String | 比赛阶段代码 |
| `matchPhaseTcName` | String | 比赛阶段名称 |
| `matchMinute` | String | 比赛进行分钟数 |
| `sectionsNos` | String | 各节比分JSON字符串（sectionNo 1-4 为常规四节，-1 为加时） |

**响应字段（teamStats 球队统计）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `statsTc` | String | 统计项代码（pointsScored/blocks/fieldGoal/3Point/freeThrows） |
| `statsTcDesc` | String | 统计项描述（得分/盖帽/投篮/三分/罚球） |
| `awayStatsData` | String | 客队统计数据值 |
| `homeStatsData` | String | 主队统计数据值 |
| `awayStatsDataRatio` | String | 客队数据占比（百分比） |
| `homeStatsDataRatio` | String | 主队数据占比（百分比） |

**响应字段（playerStats 球员统计）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `personId` | Integer | 球员ID |
| `personName` | String | 球员姓名 |
| `uniformNo` | String | 球衣号码 |
| `totalScore` | String | 总得分 |
| `goalCnt` | String | 命中数 |
| `shotCnt` | String | 出手数 |
| `blockCnt` | String | 盖帽数 |
| `stealCnt` | String | 抢断数 |
| `assistCnt` | String | 助攻数 |
| `turnoverCnt` | String | 失误数 |
| `defenceReboundCnt` | String | 防守篮板数 |
| `offenseReboundCnt` | String | 进攻篮板数 |
| `threePointGoalCnt` | String | 三分命中数 |
| `threePointShotCnt` | String | 三分出手数 |
| `freeThrowGoalCnt` | String | 罚球命中数 |
| `freeThrowShotCnt` | String | 罚球出手数 |
| `playingMinuteCnt` | String | 出场分钟数 |
| `starterFlag` | String | 是否首发（1:是, 0:否） |
| `plusMinusValue` | Integer | 正负值 |
| `personalFoulCnt` | String | 个人犯规数 |

---

### 2. 竞蓝赛程列表（未开赛）

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/basketball/list` |
| **本地路由** | `GET /api/matches/schedule?date=yyyy-MM-dd` |
| **描述** | 查询竞蓝赛程信息（未开赛比赛列表），支持实时赔率数据 |

**响应字段（matchInfo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `matchId` | String | 赛事唯一ID |
| `matchNum` | Integer | 赛事内部编号 |
| `matchNumStr` | String | 赛事展示编号（如：周五302） |
| `matchDate` | String | 赛事日期（yyyy-MM-dd） |
| `matchTime` | String | 赛事时间（HH:mm） |
| `leagueName` | String | 联赛名称 |
| `homeTeamName` | String | 主队名称 |
| `awayTeamName` | String | 客队名称 |
| `matchStatus` | String | 赛事状态（Selling/SoldOut/Closed） |

**响应字段（poolList 投注玩法）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `poolCode` | String | 玩法编码（HDC=胜负/HILO=大小分/MNL=让分胜负/WNM=胜分差） |
| `poolStatus` | String | 玩法状态（Selling/Closed） |

**响应字段（oddsList 赔率）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `poolCode` | String | 玩法编码 |
| `homeOdds` | Number | 主队赔率 |
| `awayOdds` | Number | 客队赔率 |
| `goalLine` | String | 让分值或大小分线（如 +9.50、+154.50） |
| `updateTime` | String | 数据更新时间 |

---

### 3. 竞蓝赛程列表（全部赛事）

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/basketball/all-list` |
| **描述** | 查询竞蓝赛程列表（全部赛事信息，支持按照日期查询），支持实时赔率数据 |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `date` | String | 是 | 日期，格式 `yyyy-MM-dd` |

> 注意：此接口在后端 `apiService.js` 中已实现（`getBasketballAllList`），但当前路由层尚未暴露此端点，需要扩展。

---

### 4. 篮球赛事综合信息

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/basketball/info` |
| **本地路由** | `GET /api/matches/info/:matchId` |
| **描述** | 查询篮球赛事综合信息，包含历史交锋、比赛特征、近期战绩、战绩明细及积分榜等 |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `matchId` | String | 是 | 赛事ID，不能为空 |

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `history` | Object | 历史交锋数据（totalMatches/homeTeamWins/awayTeamWins/胜率等） |
| `feature` | Object | 比赛特征数据 |
| `result` | Object | 近期战绩概览（主客队近期胜负/胜率/得失分） |
| `resultDetails` | Array | 近期战绩明细列表（matchDate/fullScore/winningTeam） |
| `historyDetails` | Array | 历史交锋明细列表 |
| `tables` | Object | 积分榜数据（排名/总胜负/主客场胜负/胜率） |

---

### 5. 篮球赔率信息

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/basketball/odds` |
| **本地路由** | `GET /api/matches/odds/:matchId` |
| **描述** | 查询竞蓝赔率信息，包含胜负(HDC)、大小分(HILO)、让分胜负(MNL)、胜分差(WNM)等赔率数据 |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `matchId` | String | 是 | 赛事ID，不能为空 |

**响应字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `hdcOddsList` | Array | 胜负(HDC)赔率列表（goalLine/h主胜赔率/a客胜赔率/hf/af变化标识） |
| `mnlOddsList` | Array | 让分胜负(MNL)赔率列表 |
| `wnmOddsList` | Array | 胜分差(WNM)赔率列表（w1-w6主胜各档/l1-l6客胜各档） |
| `hiloOddsList` | Array | 大小分(HILO)赔率列表（goalLine大小分线/h大分赔率/l小分赔率） |

---

### 6. 篮球赛后开奖信息

| 属性 | 值 |
|------|-----|
| **接口路径** | `GET /firo/bb-text/match-results` |
| **本地路由** | `GET /api/matches/results?startDate=&endDate=` |
| **描述** | 查询篮球比赛赛后开奖信息，包含赛事基本信息、全场比分、让分、大小分、胜分差等玩法开奖结果及赔率信息 |

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `startDate` | String | 是 | 开始日期，格式 `yyyy-MM-dd` |
| `endDate` | String | 是 | 结束日期，格式 `yyyy-MM-dd` |

**响应字段（results 列表）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `matchId` | Integer | 赛事ID |
| `allHomeTeam` | String | 主队全称 |
| `allAwayTeam` | String | 客队全称 |
| `matchDate` | String | 比赛日期 |
| `finalScore` | String | 全场比分（如 104-128） |
| `matchNumStr` | String | 赛事编号展示（如 周日325） |
| `oddsResults` | Array | 开奖明细列表 |

**响应字段（oddsResults 开奖明细）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `poolCode` | String | 玩法代码（HDC/HILO/MNL/WNM） |
| `combination` | String | 投注项（H=主队/A=客队/L=小/H=大） |
| `combinationDesc` | String | 投注项描述（如 让分主胜、大、主胜） |
| `goalLine` | String | 盘口值（如 -12.5、231.5） |
| `odds` | Number | 赔率 |
| `isWin` | Integer | 是否命中（1=命中） |

---

## 其他接口（文档中存在，后端暂未集成）

| 接口路径 | 说明 |
|----------|------|
| `GET /firo/sports-lottery/list` | 体育彩票赛程列表 |
| `GET /firo/sports-lottery/all-list` | 体育彩票全部赛事 |
| `GET /firo/sports-lottery/football-info` | 足球赛事综合信息 |
| `GET /firo/sports-lottery/odds` | 足球赔率信息 |
| `GET /firo/sports-lottery/deepseek-analysis` | DeepSeek AI 分析 |
| `GET /firo/sports-lottery/deepseek-good-usage` | DeepSeek 优质用法 |
| `GET /firo/text/live` | 足球文字战况直播 |
| `GET /firo/text/match-results` | 足球赛后开奖信息 |
| `GET /firo/basic/usage/remaining` | 查询 API 调用量 |

---

## 本地后端 API 路由汇总

| 本地路由 | 方法 | 说明 |
|----------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/config` | GET | 获取当前 API 配置 |
| `/api/config` | POST | 保存 API 配置 |
| `/api/config/ping` | POST | Ping 测试（验证 API 连接） |
| `/api/matches/live` | GET | 篮球文字战况直播（`?date=yyyy-MM-dd`） |
| `/api/matches/schedule` | GET | 竞蓝赛程列表（`?date=yyyy-MM-dd`） |
| `/api/matches/info/:matchId` | GET | 赛事综合信息 |
| `/api/matches/odds/:matchId` | GET | 赛事赔率信息 |
| `/api/matches/player-stats/:matchId` | GET | 球员统计（`?date=yyyy-MM-dd`） |
| `/api/matches/results` | GET | 赛后开奖信息（`?startDate=&endDate=`） |
| `/api/monitor/tasks` | GET | 获取监控任务列表 |
| `/api/monitor/tasks` | POST | 创建监控任务 |
| `/api/monitor/tasks/:id/stop` | POST | 停止监控任务 |
| `/api/monitor/tasks/:id/resume` | POST | 恢复监控任务 |
| `/api/monitor/tasks/:id/records` | GET | 获取任务历史记录 |
| `/api/monitor/tasks/:id/export` | GET | 导出 Excel |
