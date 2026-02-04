/**
 * 飞书 OAuth 授权服务器
 * 启动后访问 http://localhost:8080 进行授权
 */

import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { FeishuAuth } from './src/auth.js';
import { FeishuConfig } from './src/config.js';

const PORT = 8080;

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

const server = http.createServer(async (req, res) => {
  const appId = process.env.FEISHU_APP_ID!;
  const appSecret = process.env.FEISHU_APP_SECRET!;

  if (req.url === '/') {
    // 生成授权 URL - 使用正确的权限范围
    const scopes = ['calendar'].join(' ');
    const redirectUri = `http://localhost:${PORT}/callback`;
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?` +
      `app_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}`;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>飞书日历授权</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          h1 { color: #3370ff; }
          .step { background: #f5f6f7; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .btn { display: inline-block; background: #3370ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
          .btn:hover { background: #295ac8; }
          .token-box { background: #f0f9ff; border: 1px solid #b8e0ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
          code { word-break: break-all; }
        </style>
      </head>
      <body>
        <h1>飞书日历 MCP 授权</h1>

        <div class="step">
          <strong>步骤 1:</strong> 请在飞书开放平台配置重定向 URI:<br>
          <code>http://localhost:${PORT}/callback</code>
        </div>

        <div class="step">
          <strong>步骤 2:</strong> 点击下方按钮进行授权
          <br>
          <a href="${authUrl}" class-btn">点击授权</a>
        </div>
      </body>
      </html>
    `);
  } else if (req.url?.startsWith('/callback')) {
    // 处理回调
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>授权失败</h1><p>错误: ${error}</p><p><a href="/">返回</a></p>`);
      return;
    }

    if (code) {
      try {
        const tokenInfo = await exchangeToken(appId, appSecret, code);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>授权成功</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              h1 { color: #52c41a; }
              .token-box { background: #f0f9ff; border: 1px solid #b8e0ff; padding: 15px; border-radius: 8px; margin-top: 20px; }
              code { display: block; background: white; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 12px; }
              .copy-btn { background: #3370ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
            </style>
          </head>
          <body>
            <h1>✓ 授权成功!</h1>

            <div class="token-box">
              <strong>用户访问令牌 (User Access Token):</strong>
              <code id="token">${tokenInfo.accessToken}</code>
              <button class="copy-btn" onclick="copyToken()">复制令牌</button>
            </div>

            <div class="token-box">
              <strong>刷新令牌 (Refresh Token):</strong>
              <code>${tokenInfo.refreshToken}</code>
            </div>

            <p style="margin-top: 30px; color: #666;">
              请将上述令牌添加到 .env 文件:<br>
              <code>FEISHU_USER_ACCESS_TOKEN=${tokenInfo.accessToken}</code>
            </p>

            <script>
              function copyToken() {
                navigator.clipboard.writeText('${tokenInfo.accessToken}');
                alert('已复制到剪贴板!');
              }
            </script>
          </body>
          </html>
        `);

        console.log('\n=== 授权成功 ===');
        console.log('用户访问令牌:', tokenInfo.accessToken);
        console.log('\n请将以下内容添加到 .env 文件:');
        console.log(`FEISHU_USER_ACCESS_TOKEN=${tokenInfo.accessToken}`);
      } catch (error: any) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>获取令牌失败</h1><p>${error.message}</p><p><a href="/">返回重试</a></p>`);
        console.error('获取令牌失败:', error);
      }
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n=== 飞书 OAuth 授权服务器 ===`);
  console.log(`\n请在浏览器打开: http://localhost:${PORT}\n`);
  console.log(`注意事项:`);
  console.log(`1. 确保已在飞书开放平台配置重定向 URI: http://localhost:${PORT}/callback`);
  console.log(`2. 授权成功后，令牌会显示在页面上并自动复制\n`);
});
