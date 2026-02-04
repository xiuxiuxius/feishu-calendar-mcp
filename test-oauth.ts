import 'dotenv/config';

async function main() {
  // 临时清除 token 来测试 OAuth 流程
  const originalRefreshToken = process.env.FEISHU_REFRESH_TOKEN;
  const originalUserToken = process.env.FEISHU_USER_ACCESS_TOKEN;

  delete process.env.FEISHU_REFRESH_TOKEN;
  delete process.env.FEISHU_USER_ACCESS_TOKEN;

  console.log('=== 测试 OAuth 授权流程 ===');
  console.log('当前配置:');
  console.log('- APP_ID:', process.env.FEISHU_APP_ID ? '✓' : '✗');
  console.log('- APP_SECRET:', process.env.FEISHU_APP_SECRET ? '✓' : '✗');
  console.log('- REFRESH_TOKEN:', process.env.FEISHU_REFRESH_TOKEN ? '✓' : '(未配置，将触发OAuth)');
  console.log('- USER_ACCESS_TOKEN:', process.env.FEISHU_USER_ACCESS_TOKEN ? '✓' : '(未配置)');

  // 恢复原始配置
  if (originalRefreshToken) process.env.FEISHU_REFRESH_TOKEN = originalRefreshToken;
  if (originalUserToken) process.env.FEISHU_USER_ACCESS_TOKEN = originalUserToken;

  console.log('\n说明: 当未配置 token 时，启动 MCP 服务器会自动打开授权页面');
}

main();
