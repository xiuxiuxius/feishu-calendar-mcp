#!/usr/bin/env node

/**
 * 飞书日历授权脚本
 * 用于获取 refresh_token
 */

import 'dotenv/config';
import { OAuthHelper } from './dist/oauth.js';
import { FeishuConfig } from './dist/config.js';

async function main() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('错误: 请在 .env 文件中配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
    process.exit(1);
  }

  const config: FeishuConfig = {
    appId,
    appSecret,
  };

  const oauth = new OAuthHelper(config);

  console.log('\n=== 飞书日历授权 ===\n');
  console.log('正在启动授权服务器...\n');

  try {
    const tokens = await oauth.startAuthServer();

    console.log('\n✓ 授权成功!');
    console.log(`\n你的 Refresh Token:`);
    console.log(tokens.refreshToken);
    console.log('\n请将以下内容添加到 .env 文件:\n');
    console.log(`FEISHU_REFRESH_TOKEN=${tokens.refreshToken}\n`);

    // 自动更新 .env 文件
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.join(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      if (!envContent.includes('FEISHU_REFRESH_TOKEN')) {
        envContent += `\nFEISHU_REFRESH_TOKEN=${tokens.refreshToken}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log('✓ 已自动更新 .env 文件\n');
      }
    }

    console.log('现在可以重启 Claude Desktop 使用飞书日历功能了！\n');
  } catch (error: any) {
    console.error('\n✗ 授权失败:', error.message);
    process.exit(1);
  }
}

main();
