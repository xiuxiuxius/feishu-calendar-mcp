/**
 * 飞书用户授权指南
 * Feishu User Authorization Guide
 *
 * 这个脚本会帮助你获取用户访问令牌 (User Access Token)
 * This script helps you get the User Access Token
 */

import 'dotenv/config';
import readline from 'readline';
import { FeishuAuth } from './src/auth.js';
import { FeishuConfig } from './src/config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function getOAuthUrl(appId: string, redirectUri: string) {
  // 飞书 OAuth 授权 URL - 使用正确的权限范围
  const scopes = 'calendar';

  return `https://open.feishu.cn/open-apis/authen/v1/authorize?` +
    `app_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes)}`;
}

async function exchangeToken(appId: string, appSecret: string, code: string) {
  const response = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
      grant_type: 'authorization_code',
      code: code,
    }),
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`获取令牌失败: ${result.msg}`);
  }

  return {
    accessToken: result.data.access_token,
    refreshToken: result.data.refresh_token,
    expiresIn: result.data.expires_in,
  };
}

async function main() {
  console.log('=== 飞书用户授权指南 ===\n');

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    console.log('错误: 请先设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    console.log('\n创建 .env 文件：');
    console.log('  FEISHU_APP_ID=cli_xxxxxxxxxxxxx');
    console.log('  FEISHU_APP_SECRET=xxxxxxxxxxxxxxxxxxxx\n');
    rl.close();
    return;
  }

  console.log(`你的应用 ID: ${appId}\n`);

  // 步骤 1: 生成授权 URL
  console.log('步骤 1: 生成授权 URL');
  console.log('----------------------');

  const redirectUri = 'http://localhost:8080/callback';  // 本地回调地址
  const authUrl = await getOAuthUrl(appId, redirectUri);

  console.log('请在飞书开放平台配置以下重定向 URI:');
  console.log(`  ${redirectUri}\n`);

  console.log('授权 URL (请在新标签页打开):');
  console.log(`  ${authUrl}\n`);

  // 步骤 2: 等待用户输入授权码
  console.log('步骤 2: 获取授权码');
  console.log('----------------------');
  console.log('1. 点击上方授权链接');
  console.log('2. 登录并授权应用');
  console.log('3. 授权后会跳转到: ' + redirectUri);
  console.log('4. 复制 URL 中的 code 参数\n');

  const code = await question('请输入授权码 (code): ');

  if (!code) {
    console.log('未输入授权码，退出');
    rl.close();
    return;
  }

  // 步骤 3: 换取访问令牌
  console.log('\n步骤 3: 换取访问令牌');
  console.log('----------------------');

  try {
    const tokenInfo = await exchangeToken(appId, appSecret, code);

    console.log('成功获取访问令牌!\n');
    console.log('访问令牌 (Access Token):');
    console.log(tokenInfo.accessToken);
    console.log('\n刷新令牌 (Refresh Token):');
    console.log(tokenInfo.refreshToken);
    console.log(`\n过期时间: ${tokenInfo.expiresIn} 秒\n`);

    console.log('请将以下内容添加到 .env 文件:');
    console.log(`\nFEISHU_USER_ACCESS_TOKEN=${tokenInfo.accessToken}\n`);

    // 测试令牌
    console.log('步骤 4: 验证令牌');
    console.log('----------------------');

    const config: FeishuConfig = {
      appId,
      appSecret,
      userAccessToken: tokenInfo.accessToken,
    };

    const auth = new FeishuAuth(config);

    // 测试获取用户信息
    try {
      const headers = await auth.getAuthHeaders(true);
      const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers,
      });

      const userResult = await userResponse.json();

      if (userResult.code === 0) {
        console.log('令牌验证成功!');
        console.log(`用户: ${userResult.data.user.name}`);
      }
    } catch (error) {
      console.log('令牌验证失败:', error);
    }

    console.log('\n=== 授权完成 ===');
  } catch (error: any) {
    console.error('错误:', error.message);
  }

  rl.close();
}

main();
