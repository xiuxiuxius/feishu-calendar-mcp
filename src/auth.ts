/**
 * 飞书 API 认证模块
 * Feishu API Authentication Module
 */

import { FeishuConfig, FeishuResponse } from './config.js';

export class FeishuAuth {
  private config: FeishuConfig;
  private tenantAccessToken?: string;
  private tokenExpireTime?: number;

  constructor(config: FeishuConfig) {
    this.config = config;
    this.tenantAccessToken = config.tenantAccessToken;
  }

  /**
   * 获取租户访问令牌 (Tenant Access Token)
   * 用于应用访问资源的授权
   */
  async getTenantAccessToken(): Promise<string> {
    // 如果已提供 token，直接使用
    if (this.config.tenantAccessToken) {
      return this.config.tenantAccessToken;
    }

    // 检查缓存 token 是否有效
    if (this.tenantAccessToken && this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
      return this.tenantAccessToken;
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

    this.tenantAccessToken = result.data!.tenant_access_token;
    // 提前 5 分钟过期
    this.tokenExpireTime = Date.now() + (result.data!.expire - 300) * 1000;

    return this.tenantAccessToken;
  }

  /**
   * 获取用户访问令牌 (User Access Token)
   * 需要用户授权时使用
   */
  getUserAccessToken(): string {
    if (!this.config.userAccessToken) {
      throw new Error('User access token is required for this operation');
    }
    return this.config.userAccessToken;
  }

  /**
   * 获取认证头
   */
  async getAuthHeaders(useUserToken = false): Promise<Record<string, string>> {
    const token = useUserToken
      ? this.getUserAccessToken()
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
    this.tenantAccessToken = undefined;
    this.tokenExpireTime = undefined;
    await this.getTenantAccessToken();
  }
}
