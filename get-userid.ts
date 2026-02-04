import 'dotenv/config';
import { FeishuCalendarClient } from './dist/client.js';

async function getUserId() {
  const config = {
    appId: process.env.FEISHU_APP_ID!,
    appSecret: process.env.FEISHU_APP_SECRET!,
  };

  console.log('=== 获取飞书用户 ID ===\n');

  // 使用 tenant_access_token 来获取用户信息
  // 先获取 tenant_access_token
  const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  const tokenResult = await tokenResponse.json();

  if (tokenResult.code !== 0) {
    console.error('❌ 获取租户令牌失败:', tokenResult.msg);
    return;
  }

  const tenantAccessToken = tokenResult.tenant_access_token;

  // 获取应用信息，其中可能包含创建者信息
  console.log('你的应用信息:');
  console.log(`App ID: ${config.appId}`);
  console.log(`\n要在 Claude Desktop 中使用 app_access_token 模式，你需要知道你的 user_id`);
  console.log(`\n获取 user_id 的方式：`);
  console.log(`1. 在飞书中打开你的个人资料`);
  console.log(`2. 点击你的头像，查看个人资料`);
  console.log(`3. user_id 就是你的 open_id，格式类似: ou_xxxxxxxxxxxxx`);
  console.log(`\n或者运行飞书开放平台的调试工具: https://open.feishu.cn/api-explorer/`);
  console.log(`使用 contact::user:get:by_emails API 查询你的邮箱获取 user_id\n`);

  // 尝试获取创建者的信息
  console.log('提示：如果你是应用创建者，你的 user_id 可能就是应用的 owner_id');
}

getUserId();
