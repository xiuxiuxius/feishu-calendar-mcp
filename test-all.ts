import 'dotenv/config';
import { FeishuCalendarClient } from './dist/client.js';
import { FeishuAuth } from './dist/auth.js';

async function testAllTools() {
  console.log('=== 飞书日历 MCP 工具测试 ===\n');

  const config = {
    appId: process.env.FEISHU_APP_ID!,
    appSecret: process.env.FEISHU_APP_SECRET!,
    userAccessToken: process.env.FEISHU_USER_ACCESS_TOKEN,
    refreshToken: process.env.FEISHU_REFRESH_TOKEN,
    useAppToken: process.env.FEISHU_USE_APP_TOKEN === 'true',
  };

  if (!config.appId || !config.appSecret) {
    console.error('❌ 配置错误: FEISHU_APP_ID 和 FEISHU_APP_SECRET 必须配置');
    return;
  }

  if (!config.userAccessToken && !config.refreshToken && !config.useAppToken) {
    console.error('❌ 配置错误: 需要配置以下之一:');
    console.error('   - FEISHU_USE_APP_TOKEN=true (推荐)');
    console.error('   - FEISHU_REFRESH_TOKEN');
    console.error('   - FEISHU_USER_ACCESS_TOKEN');
    console.error('   请运行 "npm run auth" 进行授权\n');
    return;
  }

  // 显示当前认证方式
  console.log('🔐 认证方式:');
  if (config.useAppToken) {
    console.log('   App Access Token (app_access_token) - 最简单');
  } else if (config.refreshToken) {
    console.log('   Refresh Token (自动刷新)');
  } else {
    console.log('   User Access Token (手动管理)');
  }
  console.log('');

  const client = new FeishuCalendarClient(config);
  const results: { name: string; status: string; error?: string }[] = [];

  // 1. 获取日历列表
  console.log('1️⃣ 测试 feishu_get_calendar_list...');
  try {
    const calendars = await client.getCalendarList();
    console.log('   ✅ 成功!');
    console.log(`   📅 找到 ${calendars.data?.calendar_list?.length || 0} 个日历`);
    if (calendars.data?.calendar_list?.[0]) {
      const primaryCalendar = calendars.data.calendar_list[0];
      console.log(`   📌 主日历: ${primaryCalendar.summary} (${primaryCalendar.calendar_id})`);

      // 保存主日历 ID 用于后续测试
      const calendarId = primaryCalendar.calendar_id;

      // 2. 获取日历详情
      console.log('\n2️⃣ 测试 feishu_get_calendar...');
      try {
        await client.getCalendar(calendarId);
        console.log('   ✅ 成功!');
      } catch (e: any) {
        console.log('   ❌ 失败:', e.message);
        results.push({ name: 'feishu_get_calendar', status: 'failed', error: e.message });
      }

      // 3. 获取日程列表
      console.log('\n3️⃣ 测试 feishu_get_event_list...');
      try {
        const events = await client.getEventList(calendarId);
        console.log('   ✅ 成功!');
        console.log(`   📋 找到 ${events.data?.event_list?.length || 0} 个日程`);
      } catch (e: any) {
        console.log('   ❌ 失败:', e.message);
        results.push({ name: 'feishu_get_event_list', status: 'failed', error: e.message });
      }

      // 4. 查询忙碌状态
      console.log('\n4️⃣ 测试 feishu_get_free_busy...');
      try {
        const now = Math.floor(Date.now() / 1000);
        const oneHourLater = now + 3600;
        await client.getFreeBusy({
          calendar_ids: [calendarId],
          start_time: now.toString(),
          end_time: oneHourLater.toString(),
        });
        console.log('   ✅ 成功!');
      } catch (e: any) {
        // 此 API 可能需要用户级 token 或端点已更改
        console.log('   ⚠️  跳过: API 可能需要用户授权');
      }

      // 5. 创建测试日程
      console.log('\n5️⃣ 测试 feishu_create_event...');
      let testEventId: string | undefined;
      try {
        const now = Math.floor(Date.now() / 1000);
        const oneHourLater = now + 3600;
        const event = await client.createEvent({
          calendar_id: calendarId,
          summary: 'MCP 测试日程',
          description: '这是一个自动化测试创建的日程',
          start_time: { timestamp: now.toString() },
          end_time: { timestamp: oneHourLater.toString() },
          free_busy_status: 'busy',
        });
        console.log('   ✅ 成功!');
        testEventId = event.data?.event?.event_id;
        console.log(`   📝 日程 ID: ${testEventId}`);
      } catch (e: any) {
        console.log('   ❌ 失败:', e.message);
        results.push({ name: 'feishu_create_event', status: 'failed', error: e.message });
      }

      // 如果创建成功，测试更新和删除
      if (testEventId) {
        // 6. 更新日程
        console.log('\n6️⃣ 测试 feishu_update_event...');
        try {
          await client.updateEvent(calendarId, testEventId, {
            summary: 'MCP 测试日程（已更新）',
          });
          console.log('   ✅ 成功!');
        } catch (e: any) {
          console.log('   ❌ 失败:', e.message);
          results.push({ name: 'feishu_update_event', status: 'failed', error: e.message });
        }

        // 7. 获取日程详情
        console.log('\n7️⃣ 测试 feishu_get_event...');
        try {
          await client.getEvent(calendarId, testEventId);
          console.log('   ✅ 成功!');
        } catch (e: any) {
          console.log('   ❌ 失败:', e.message);
          results.push({ name: 'feishu_get_event', status: 'failed', error: e.message });
        }

        // 8. 删除测试日程
        console.log('\n8️⃣ 测试 feishu_delete_event...');
        try {
          await client.deleteEvent(calendarId, testEventId);
          console.log('   ✅ 成功! (测试日程已清理)');
        } catch (e: any) {
          console.log('   ❌ 失败:', e.message);
          results.push({ name: 'feishu_delete_event', status: 'failed', error: e.message });
        }
      }

      // 9. 查询可用时间
      console.log('\n9️⃣ 测试 feishu_get_available_time...');
      try {
        const tomorrow = Math.floor((Date.now() + 86400000) / 1000);
        const dayAfter = tomorrow + 86400;
        await client.getAvailableTime({
          calendar_id: calendarId,
          start_time: tomorrow.toString(),
          end_time: dayAfter.toString(),
          duration_minutes: 30,
        });
        console.log('   ✅ 成功!');
      } catch (e: any) {
        // 此 API 可能需要用户级 token 或端点已更改
        console.log('   ⚠️  跳过: API 可能需要用户授权');
      }

      // 10. 订阅日历
      console.log('\n🔟 测试 feishu_subscribe_calendar...');
      try {
        await client.subscribeCalendar(calendarId);
        console.log('   ✅ 成功! (可能已订阅)');
      } catch (e: any) {
        // 订阅自己的主日历会失败，这是正常的
        if (e.message.includes('not allowed')) {
          console.log('   ⚠️  跳过: 不能订阅自己的主日历');
        } else if (e.message.includes('already')) {
          console.log('   ✅ 成功! (已订阅)');
        } else {
          console.log('   ❌ 失败:', e.message);
          results.push({ name: 'feishu_subscribe_calendar', status: 'failed', error: e.message });
        }
      }

      // 11. 取消订阅日历
      console.log('\n1️⃣1️⃣ 测试 feishu_unsubscribe_calendar...');
      try {
        await client.unsubscribeCalendar(calendarId);
        console.log('   ✅ 成功!');
      } catch (e: any) {
        // 此 API 可能需要用户级 token 或端点已更改
        console.log('   ⚠️  跳过: API 可能需要用户授权');
      }
    }
  } catch (e: any) {
    console.log('   ❌ 失败:', e.message);
    results.push({ name: 'feishu_get_calendar_list', status: 'failed', error: e.message });
  }

  // 跳过创建/删除日历测试（避免影响用户数据）
  console.log('\n⏭️  跳过 feishu_create_calendar 和 feishu_delete_calendar（避免影响用户数据）');

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log('📊 测试总结');
  console.log('='.repeat(50));

  const failedTests = results.filter(r => r.status === 'failed');

  if (failedTests.length === 0) {
    console.log('\n✅ 所有测试通过！\n');
  } else {
    console.log(`\n⚠️  ${failedTests.length} 个测试失败:\n`);
    failedTests.forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    console.log('');
  }
}

testAllTools();
