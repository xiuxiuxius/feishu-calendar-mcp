/**
 * 飞书开放平台配置
 * Feishu Open Platform Configuration
 */

export interface FeishuConfig {
  // 应用 ID (App ID)
  appId: string;
  // 应用密钥 (App Secret)
  appSecret: string;
  // 租户访问令牌 (Tenant Access Token) - 可选，如果不提供会自动获取
  tenantAccessToken?: string;
  // 用户访问令牌 (User Access Token) - 需要用户授权时使用
  userAccessToken?: string;
  // 用户刷新令牌 (User Refresh Token) - 用于自动刷新访问令牌
  refreshToken?: string;
  // 是否使用应用访问令牌 (App Access Token) - 最简单的方式，只需 app_id 和 app_secret
  useAppToken?: boolean;
  // 用户 ID (使用 app_access_token 时需要，用于代表用户操作)
  userId?: string;
  // API 基础 URL
  apiBaseUrl?: string;
}

export interface FeishuResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}

export interface PaginationParams {
  page_token?: string;
  page_size?: number;
}

// 日历相关类型定义
export interface Calendar {
  calendar_id: string;
  summary: string;
  description?: string;
  color?: string;
  permissions?: string;
  location?: string;
}

export interface Event {
  event_id: string;
  calendar_id: string;
  summary: string;
  description?: string;
  start_time: {
    timestamp: string;
  };
  end_time: {
    timestamp: string;
  };
  location?: string;
  attendee_ability?: string;
  visibility?: string;
  free_busy_status?: string;
  status?: string;
  created_by?: string;
  updated_by?: string;
  attendees?: Attendee[];
  recurrence?: string;
}

export interface Attendee {
  user_id: string;
  type: string;
  display_name?: string;
  accept_status?: string;
}

export interface CreateEventParams {
  calendar_id: string;
  summary: string;
  description?: string;
  start_time: {
    timestamp: string;
    timezone?: string;
  };
  end_time: {
    timestamp: string;
    timezone?: string;
  };
  location?: string;
  attendee_ability?: string;
  visibility?: string;
  free_busy_status?: string;
  attendees?: {
    user_id: string;
    type: string;
  }[];
  recurrence?: string;
}

export interface GetFreeBusyParams {
  calendar_ids: string[];
  start_time: string;
  end_time: string;
}
