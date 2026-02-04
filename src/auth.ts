/**
 * 飞书 API 认证模块
 * Feishu API Authentication Module
 */

import { FeishuConfig, FeishuResponse } from './config.js';

interface TokenCache {
  accessToken: string;
  expireTime: number;
}

export class FeishuAuth {
  private config: FeishuConfig;
  private tenantTokenCache?: TokenCache;
  private userTokenCache?: TokenCache;

  constructor(config: FeishuConfig) {
    this.config = config;
    if (config.tenantAccessToken) {
      this.tenantTokenCache = {
        accessToken: config.tenantAccessToken,
        expireTime: Date.now() + 7200000, // 默认 2 小时
      };
    }
  }

  /**
   * 获取租户访问令牌 (Tenant Access Token)
   * 用于应用访问资源的授权
   */
  async getTenantAccessToken(): Promise<string> {
    // 检查缓存 token 是否有效
    if (this.tenantTokenCache && Date.now() < this.tenantTokenCache.expireTime) {
      return this.tenantTokenCache.accessToken;
    }

    // 获取新 token
    const baseUrl = this.config.apiBaseUrl || 'https://open.feishu.cn';
    const response = await fetch(`${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: this.config.appId,
        app_secret: this.config.appSecret,
      }),
    });

    const result: FeishuResponse<{ tenant_access_token: string; expire: number }> =
      await response.json();

    if (result.code !== 0) {
      throw new Error(`Failed to get tenant access token: ${result.msg}`);
    }

    this.tenantTokenCache = {
      accessToken: result.data!.tenant_access_token,
      // 提前 5 分钟过期
      expireTime: Date.now() + (result.data!.expire - 300) * 1000,
    };

    return this.tenantTokenCache.accessToken;
  }

  /**
   * 获取用户访问令牌 (User Access Token)
   * 自动处理 token 刷新
   */
  async getUserAccessToken(): Promise<string> {
    // 如果配置了 access token 且没有过期，直接使用
    if (this.config.userAccessToken && !this.config.refreshToken) {
      return this.config.userAccessToken;
    }

    // 检查缓存的 token 是否有效
    if (this.userTokenCache && Date.now() < this.userTokenCache.expireTime) {
      return this.userTokenCache.accessToken;
    }

    // 如果有刷新令牌，自动刷新
    if (this.config.refreshToken) {
      return await this.refreshUserAccessToken();
    }

    // 如果没有刷新令牌，使用配置的 access token
    if (this.config.userAccessToken) {
      return this.config.userAccessToken;
    }

    throw new Error('User access token or refresh token is required');
  }

  /**
   * 刷新用户访问令牌
   */
  async refreshUserAccessToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('Refresh token is required to refresh user access token');
    }

    const baseUrl = this.config.apiBaseUrl || 'https://open.feishu.cn';
    const response = await fetch(`${baseUrl}/open-apis/authen/v1/oidc/refresh_access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.config.refreshToken,
      }),
    });

    const result: FeishuResponse<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }> = await response.json();

    if (result.code !== 0) {
      throw new Error(`Failed to refresh user access token: ${result.msg}`);
    }

    // 更新缓存
    this.userTokenCache = {
      accessToken: result.data!.access_token,
      // 提前 5 分钟过期
      expireTime: Date.now() + (result.data!.expires_in - 300) * 1000,
    };

    // 更新刷新令牌（如果返回了新的）
    if (result.data!.refresh_token) {
      this.config.refreshToken = result.data!.refresh_token;
    }

    // 打印提示（仅首次刷新时）
    if (!this.config.userAccessToken) {
      console.error(`[Feishu] Refreshed user access token, new refresh_token: ${this.config.refreshToken}`);
      console.error(`[Feishu] Please update your config with the new refresh_token for next time`);
    }

    return this.userTokenCache.accessToken;
  }

  /**
   * 获取认证头
   */
  async getAuthHeaders(useUserToken = false): Promise<Record<string, string>> {
    const token = useUserToken
      ? await this.getUserAccessToken()
      : await this.getTenantAccessToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 刷新租户访问令牌
   */
  async refreshToken(): Promise<void> {
    this.tenantTokenCache = undefined;
    await this.getTenantAccessToken();
  }

  /**
   * 获取当前刷新令牌（用于保存）
   */
  getCurrentRefreshToken(): string | undefined {
    return this.config.refreshToken;
  }
}
