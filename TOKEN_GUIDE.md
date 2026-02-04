# 获取用户访问令牌指南

## 方法一：飞书开放平台 API 调试（推荐，最简单）

### 步骤 1: 访问飞书开放平台

打开：https://open.feishu.cn/api-explorer/

### 步骤 2: 获取用户访问令牌

1. 在左侧选择 `authen` → `getUserAccessTokenBy3rdApp`
2. 填写你的 App ID 和 App Secret
3. 点击"发送请求"
4. 复制返回的 `access_token`

### 步骤 3: 配置令牌

将令牌添加到 Claude Desktop 配置：

```json
{
  "mcpServers": {
    "feishu-calendar": {
      "command": "node",
      "args": ["/path/to/feishu-calendar/dist/index.js"],
      "env": {
        "FEISHU_APP_ID": "your_app_id_here",
        "FEISHU_APP_SECRET": "your_app_secret_here",
        "FEISHU_USER_ACCESS_TOKEN": "刚才复制的access_token"
      }
    }
  }
}
```

## 方法二：使用 curl 命令

```bash
curl -X POST "https://open.feishu.cn/open-apis/authen/v1/oidc/access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "your_app_id",
    "app_secret": "your_app_secret",
    "grant_type": "client_credentials"
  }'
```

## 令牌有效期

用户访问令牌有效期通常是 **2 小时**，过期后需要重新获取。

## 测试连接

配置完成后，运行测试：

```bash
npx tsx test-client.ts
```

如果看到"服务器配置正常"，说明配置成功！
