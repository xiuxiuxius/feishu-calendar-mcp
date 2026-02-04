/**
 * 飞书 OAuth 授权辅助工具
 * 用于简化 refresh_token 的获取
 */

import http from 'http';
import { URL } from 'url';
import { FeishuConfig } from './config.js';

export class OAuthHelper {
  private config: FeishuConfig;
  private port: number;
  private redirectUri: string;

  constructor(config: FeishuConfig, port = 3456) {
    this.config = config;
    this.port = port;
    this.redirectUri = `http://localhost:${port}/callback`;
  }

  /**
   * 生成本地授权 URL
   */
  getAuthUrl(): string {
    const scopes = 'calendar';
    return `https://open.feishu.cn/open-apis/authen/v1/authorize?` +
      `app_id=${this.config.appId}&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}`;
  }

  /**
   * 启动本地授权服务器
   * 返回一个 Promise，在用户完成授权后 resolve
   */
  async startAuthServer(): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (req.url === '/') {
          // 显示授权页面
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(this.getAuthPageHtml());
        } else if (req.url?.startsWith('/callback')) {
          // 处理回调
          const url = new URL(req.url, `http://localhost:${this.port}`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(this.getErrorHtml(error));
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (code) {
            try {
              // 交换 token
              const tokens = await this.exchangeToken(code);

              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this.getSuccessHtml(tokens.refreshToken));

              // 延迟关闭服务器，确保页面显示
              setTimeout(() => {
                server.close();
                resolve(tokens);
              }, 2000);
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(this.getErrorHtml(err.message));
              server.close();
              reject(err);
            }
          }
        }
      });

      server.listen(this.port, () => {
        console.error(`\n=== 飞书日历授权 ===`);
        console.error(`\n请在浏览器中打开以下链接进行授权：`);
        console.error(`\n${this.getAuthUrl()}`);
        console.error(`\n或者访问: http://localhost:${this.port}\n`);
      });
    });
  }

  /**
   * 交换授权码获取 token
   */
  private async exchangeToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const baseUrl = this.config.apiBaseUrl || 'https://open.feishu.cn';
    const response = await fetch(`${baseUrl}/open-apis/authen/v1/oidc/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const result = await response.json();

    if (result.code !== 0) {
      throw new Error(`获取 token 失败: ${result.msg}`);
    }

    return {
      accessToken: result.data.access_token,
      refreshToken: result.data.refresh_token,
    };
  }

  private getAuthPageHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>飞书日历授权</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
    h1 { color: #3370ff; }
    .btn { display: inline-block; background: #3370ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .btn:hover { background: #295ac8; }
  </style>
</head>
<body>
  <h1>飞书日历 MCP 授权</h1>
  <p>点击下方按钮授权飞书日历访问权限</p>
  <a href="${this.getAuthUrl()}" class="btn">授权</a>
</body>
</html>`;
  }

  private getSuccessHtml(refreshToken: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>授权成功</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; text-align: center; }
    h1 { color: #52c41a; }
    .token-box { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; word-break: break-all; }
    code { background: white; padding: 10px; border-radius: 4px; display: block; font-size: 12px; }
  </style>
</head>
<body>
  <h1>✓ 授权成功!</h1>
  <p>你的 Refresh Token:</p>
  <div class="token-box">
    <code>${refreshToken}</code>
  </div>
  <p style="color: #666; font-size: 14px;">请将此 token 添加到 MCP 配置中</p>
  <p style="color: #666; font-size: 14px;">你可以关闭此页面了</p>
</body>
</html>`;
  }

  private getErrorHtml(error: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>授权失败</title>
</head>
<body>
  <h1>授权失败</h1>
  <p>错误: ${error}</p>
  <p><a href="/">返回重试</a></p>
</body>
</html>`;
  }
}
