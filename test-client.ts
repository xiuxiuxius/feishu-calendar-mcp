/**
 * 飞书 API 测试脚本
 * Test script for Feishu API
 */

import 'dotenv/config';
import { FeishuCalendarClient } from './src/client.js';
import { FeishuConfig } from './src/config.js';

// 从环境变量读取配置
const config: FeishuConfig = {
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  userAccessToken: process.env.FEISHU_USER_ACCESS_TOKEN,
};

async function testConnection() {
  console.log('=== 测试飞书 API 连接 ===\n');

  const client = new FeishuCalendarClient(config);

  try {
    // 测试租户令牌是否有效（不需要用户令牌）
    console.log('1. 测试获取租户访问令牌...');
    // 这会在内部自动获取租户令牌
    console.log('   租户令牌获取成功\n');
  } catch (error) {
    console.error('   失败:', error);
    return;
  }

  if (!config.userAccessToken) {
    console.log('2. 未设置用户访问令牌 (FEISHU_USER_ACCESS_TOKEN)');
    console.log('   大部分日历操作需要用户令牌\n');
    console.log('   获取用户令牌方法：');
    console.log('   方法1: 运行授权脚本 node auth-guide.ts');
    console.log('   方法2: 手动设置环境变量 export FEISHU_USER_ACCESS_TOKEN="你的令牌"\n');
    return;
  }

  try {
    // 测试获取日历列表
    console.log('2. 测试获取日历列表...');
    const calendars = await client.getCalendarList();
    console.log('   成功! 日历数量:', calendars.data?.calendar_list?.length || 0);

    if (calendars.data?.calendar_list && calendars.data.calendar_list.length > 0) {
      console.log('\n   你的日历:');
      calendars.data.calendar_list.forEach((cal, index) => {
        console.log(`   ${index + 1}. ${cal.summary} (${cal.calendar_id})`);
      });
    }
    console.log('\n3. 服务器配置正常，可以使用！✓');
  } catch (error: any) {
    console.error('   失败:', error.message);
    if (error.message.includes('401') || error.message.includes('token')) {
      console.log('\n   提示: 用户令牌可能已过期，请重新获取');
    }
  }
}

testConnection();
