# 飞书日历 MCP 服务器

Feishu Calendar MCP Server - 用于将飞书日历 API 包装成 Model Context Protocol (MCP) 服务器。

## 功能特性

- **日历管理**: 获取、创建、更新、删除日历
- **日程管理**: 获取、创建、更新、删除日程事件
- **订阅管理**: 订阅/取消订阅日历
- **忙碌状态**: 查询用户忙碌状态和可用时间
- **多种认证方式**: 支持 app_access_token、refresh_token、user_access_token

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

### 3. 配置应用权限

在飞书开放平台配置应用：

1. 进入你的应用管理页面
2. **权限管理** → **权限配置**，开通以下权限：
   - `calendar:calendar` - 查看、管理日历
   - `calendar:event` - 查看、创建、编辑日程

### 4. 配置认证方式

本服务器支持三种认证方式，推荐使用**方式一（最简单）**：

---

#### 方式一：使用 App Access Token（推荐，最简单）

只需 `app_id` 和 `app_secret`，自动获取应用级访问令牌。

```bash
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_USE_APP_TOKEN=true
FEISHU_USER_ID=ou_xxxxxxxxxxxxx  # 你的用户 open_id
```

**如何获取 user_id**:

1. 在飞书中打开你的个人资料
2. 点击你的头像，查看个人资料
3. user_id 就是你的 open_id，格式类似: `ou_xxxxxxxxxxxxx`

或者运行飞书开放平台的调试工具: https://open.feishu.cn/api-explorer/，使用 `contact::user:get:by_emails` API 查询你的邮箱获取 user_id。

---

#### 方式二：使用 Refresh Token（自动刷新）

通过 OAuth 授权获取 refresh_token，系统会自动刷新 access_token。

```bash
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_REFRESH_TOKEN=你的刷新令牌
```

运行授权脚本获取 refresh_token：

```bash
npm run auth
```

按照提示在浏览器中完成授权，refresh_token 会自动保存到 `.env` 文件。

---

#### 方式三：使用 User Access Token（手动管理）

直接使用 user_access_token，但需要注意 token 有效期约 2 小时，过期需要重新获取。

```bash
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx
FEISHU_USER_ACCESS_TOKEN=你的用户访问令牌
```

获取 user_access_token 的方式见 [TOKEN_GUIDE.md](TOKEN_GUIDE.md)

### 5. 在 Claude Desktop 中使用

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**使用 App Access Token（推荐）**:

```json
{
  "mcpServers": {
    "feishu-calendar": {
      "command": "node",
      "args": ["/path/to/feishu-calendar/dist/index.js"],
      "env": {
        "FEISHU_APP_ID": "your_app_id",
        "FEISHU_APP_SECRET": "your_app_secret",
        "FEISHU_USE_APP_TOKEN": "true",
        "FEISHU_USER_ID": "ou_xxxxxxxxxxxxx"
      }
    }
  }
}
```

**使用 Refresh Token**:

```json
{
  "mcpServers": {
    "feishu-calendar": {
      "command": "node",
      "args": ["/path/to/feishu-calendar/dist/index.js"],
      "env": {
        "FEISHU_APP_ID": "your_app_id",
        "FEISHU_APP_SECRET": "your_app_secret",
        "FEISHU_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}

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

1. **认证方式**: 推荐使用 app_access_token（只需 app_id 和 app_secret + user_id）
2. **Token 刷新**: refresh_token 会自动刷新 access_token，无需手动干预
3. **时间格式**: API 使用 Unix 时间戳（秒）
4. **权限配置**: 确保应用已获取足够的权限
5. **API 限制**: 飞书 API 有调用频率限制，请注意控制调用频率

## 许可证

MIT
