# 飞书日历 MCP 服务器

Feishu Calendar MCP Server - 用于将飞书日历 API 包装成 Model Context Protocol (MCP) 服务器。

## 功能特性

- **日历管理**: 获取、创建、更新、删除日历
- **日程管理**: 获取、创建、更新、删除日程事件
- **订阅管理**: 订阅/取消订阅日历
- **忙碌状态**: 查询用户忙碌状态和可用时间

## 快速开始

### 1. 安装依赖

```bash
npm install
npm run build
```

### 2. 获取飞书应用凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建**自建应用**
3. 获取 **App ID** 和 **App Secret**

### 3. 获取用户访问令牌（重要）

飞书日历操作需要用户访问令牌，有两种获取方式：

#### 方式 A: 使用在线调试工具（推荐，最简单）

1. 访问 [飞书开放平台 API 调试](https://open.feishu.cn/api-explorer/)
2. 选择 `authen` → `getUserAccessToken`
3. 输入你的 App ID 和 App Secret
4. 点击"调试"获取用户访问令牌

#### 方式 B: 使用 Postman/curl

```bash
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的app_id",
    "app_secret": "你的app_secret"
  }'
```

获取到的 `tenant_access_token` 可以用于部分 API。

### 4. 配置环境变量

创建 `.env` 文件：

**方式 A：使用访问令牌（简单但会过期）**

```bash
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here
FEISHU_USER_ACCESS_TOKEN=your_user_access_token_here
```

**方式 B：使用刷新令牌（推荐，自动续期）**

```bash
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here
FEISHU_REFRESH_TOKEN=your_refresh_token_here
```

> 💡 **推荐使用刷新令牌**：访问令牌有效期仅 2 小时，过期需手动更新。使用刷新令牌后，系统会自动获取新的访问令牌，无需手动干预。

### 5. 在 Claude Desktop 中使用

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "feishu-calendar": {
      "command": "node",
      "args": ["/path/to/feishu-calendar/dist/index.js"],
      "env": {
        "FEISHU_APP_ID": "your_app_id_here",
        "FEISHU_APP_SECRET": "your_app_secret_here",
        "FEISHU_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

### 6. 测试连接

```bash
npm run build
npx tsx test-client.ts
```

## 可用工具

#### 日历相关

| 工具名 | 描述 | 必需参数 |
|--------|------|----------|
| `feishu_get_calendar_list` | 获取日历列表 | - |
| `feishu_get_calendar` | 获取日历详情 | calendar_id |
| `feishu_create_calendar` | 创建日历 | summary |
| `feishu_update_calendar` | 更新日历 | calendar_id |
| `feishu_delete_calendar` | 删除日历 | calendar_id |

#### 日程事件相关

| 工具名 | 描述 | 必需参数 |
|--------|------|----------|
| `feishu_get_event_list` | 获取日程列表 | calendar_id |
| `feishu_get_event` | 获取日程详情 | calendar_id, event_id |
| `feishu_create_event` | 创建日程 | calendar_id, summary, start_time, end_time |
| `feishu_update_event` | 更新日程 | calendar_id, event_id |
| `feishu_delete_event` | 删除日程 | calendar_id, event_id |

#### 订阅相关

| 工具名 | 描述 | 必需参数 |
|--------|------|----------|
| `feishu_subscribe_calendar` | 订阅日历 | calendar_id |
| `feishu_unsubscribe_calendar` | 取消订阅日历 | calendar_id |

#### 忙碌状态相关

| 工具名 | 描述 | 必需参数 |
|--------|------|----------|
| `feishu_get_free_busy` | 查询忙碌状态 | calendar_ids, start_time, end_time |
| `feishu_get_available_time` | 获取可用时间 | calendar_id, start_time, end_time, duration_minutes |

## 使用示例

### 在 Claude Desktop 中使用

**查询我的日历列表：**

```
请帮我查询所有日历
```

**创建一个日程：**

```
帮我创建一个明天下午2点的会议，主题是"产品讨论会"，时长1小时
```

**查询某段时间的空闲时间：**

```
查询明天上午9点到12点之间，我有哪段空闲时间可以安排30分钟的会议
```

---

### API 直接调用示例

#### 创建日程（完整参数）

```bash
curl -i -X POST \
  'https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events?user_id_type=open_id' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {your_user_access_token}' \
  -d '{
    "summary": "团队周会",
    "description": "每周项目进度同步会议",
    "start_time": {
      "timestamp": "1738360800",
      "timezone": "Asia/Shanghai"
    },
    "end_time": {
      "timestamp": "1738364400",
      "timezone": "Asia/Shanghai"
    },
    "visibility": "default",
    "attendee_ability": "can_see_others",
    "free_busy_status": "busy",
    "location": "会议室 A"
  }'
```

#### 创建日程（最小参数）

```bash
curl -i -X POST \
  'https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {your_user_access_token}' \
  -d '{
    "summary": "快速会议",
    "start_time": {
      "timestamp": "1738360800"
    },
    "end_time": {
      "timestamp": "1738362600"
    }
  }'
```

#### 查询日历列表

```bash
curl -i -X GET \
  'https://open.feishu.cn/open-apis/calendar/v4/calendars' \
  -H 'Authorization: Bearer {your_user_access_token}'
```

#### 查询日程列表

```bash
curl -i -X GET \
  'https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events' \
  -H 'Authorization: Bearer {your_user_access_token}'
```

---

### 参数说明

#### 时间参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `timestamp` | string | Unix 时间戳（秒） | `"1738360800"` |
| `timezone` | string | 时区 | `"Asia/Shanghai"` |

**注意**: 飞书 API 使用**秒**级时间戳，不是毫秒！

#### 可见性 (visibility)

| 值 | 说明 |
|---|------|
| `default` | 默认 |
| `public` | 公开 |
| `private` | 私密 |

#### 参与者能力 (attendee_ability)

| 值 | 说明 |
|---|------|
| `can_see_others` | 可见其他参与者 |
| `cannot_see_others` | 不可见其他参与者 |

#### 忙碌状态 (free_busy_status)

| 值 | 说明 |
|---|------|
| `busy` | 忙碌 |
| `free` | 空闲 |

## 开发

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建
npm run build
```

## 注意事项

1. **用户令牌**: 大部分操作需要用户访问令牌 (User Access Token)
2. **时间格式**: API 使用 Unix 时间戳（毫秒）
3. **权限配置**: 确保应用已获取足够的权限
4. **API 限制**: 飞书 API 有调用频率限制，请注意控制调用频率

## 许可证

MIT
