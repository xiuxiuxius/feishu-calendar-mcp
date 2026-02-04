/**
 * 飞书日历 API 客户端
 * Feishu Calendar API Client
 */

import { FeishuAuth } from './auth.js';
import {
  FeishuConfig,
  FeishuResponse,
  Calendar,
  Event,
  PaginationParams,
  CreateEventParams,
  GetFreeBusyParams,
} from './config.js';

export class FeishuCalendarClient {
  private auth: FeishuAuth;
  private config: FeishuConfig;
  private baseUrl: string;

  constructor(config: FeishuConfig) {
    this.auth = new FeishuAuth(config);
    this.config = config;
    this.baseUrl = config.apiBaseUrl || 'https://open.feishu.cn';
  }

  /**
   * 添加 user_id 参数到 URL（使用 app_access_token 时需要）
   */
  private addUserIdParam(endpoint: string): string {
    if (this.config.useAppToken && this.config.userId) {
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${endpoint}${separator}user_id_type=open_id&user_id=${this.config.userId}`;
    }
    return endpoint;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useUserToken = false
  ): Promise<FeishuResponse<T>> {
    // 添加 user_id 参数（如果使用 app_access_token）
    endpoint = this.addUserIdParam(endpoint);

    const headers = await this.auth.getAuthHeaders(useUserToken);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const result: FeishuResponse<T> = await response.json();

    if (result.code !== 0) {
      throw new Error(`API request failed: ${result.msg} (code: ${result.code})`);
    }

    return result;
  }

  // ==================== 日历列表相关 ====================

  /**
   * 获取用户日历列表
   * Get user's calendar list
   */
  async getCalendarList(params?: PaginationParams): Promise<FeishuResponse<{
    calendar_list: Calendar[];
    page_token?: string;
    has_more?: boolean;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.page_token) queryParams.append('page_token', params.page_token);

    return this.request(`/open-apis/calendar/v4/calendars?${queryParams.toString()}`, {}, true);
  }

  /**
   * 获取日历详情
   * Get calendar details
   */
  async getCalendar(calendarId: string): Promise<FeishuResponse<Calendar>> {
    return this.request(`/open-apis/calendar/v4/calendars/${calendarId}`, {}, true);
  }

  /**
   * 创建日历
   * Create calendar
   */
  async createCalendar(params: {
    summary: string;
    description?: string;
    color?: string;
  }): Promise<FeishuResponse<{ calendar: Calendar }>> {
    return this.request('/open-apis/calendar/v4/calendars', {
      method: 'POST',
      body: JSON.stringify(params),
    }, true);
  }

  /**
   * 更新日历
   * Update calendar
   */
  async updateCalendar(
    calendarId: string,
    params: {
      summary?: string;
      description?: string;
      color?: string;
    }
  ): Promise<FeishuResponse<Calendar>> {
    return this.request(`/open-apis/calendar/v4/calendars/${calendarId}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    }, true);
  }

  /**
   * 删除日历
   * Delete calendar
   */
  async deleteCalendar(calendarId: string): Promise<FeishuResponse<void>> {
    return this.request(`/open-apis/calendar/v4/calendars/${calendarId}`, {
      method: 'DELETE',
    }, true);
  }

  // ==================== 日程事件相关 ====================

  /**
   * 获取日程列表
   * Get event list
   */
  async getEventList(
    calendarId: string,
    params?: PaginationParams & {
      start_time?: string;
      end_time?: string;
    }
  ): Promise<FeishuResponse<{
    event_list: Event[];
    page_token?: string;
    has_more?: boolean;
  }>> {
    const queryParams = new URLSearchParams();
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.page_token) queryParams.append('page_token', params.page_token);
    if (params?.start_time) queryParams.append('start_time', params.start_time);
    if (params?.end_time) queryParams.append('end_time', params.end_time);

    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/events?${queryParams.toString()}`,
      {},
      true
    );
  }

  /**
   * 获取日程详情
   * Get event details
   */
  async getEvent(calendarId: string, eventId: string): Promise<FeishuResponse<Event>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      {},
      true
    );
  }

  /**
   * 创建日程
   * Create event
   */
  async createEvent(params: CreateEventParams): Promise<FeishuResponse<{ event: Event }>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${params.calendar_id}/events`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true
    );
  }

  /**
   * 更新日程
   * Update event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    params: Partial<CreateEventParams>
  ): Promise<FeishuResponse<Event>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params),
      },
      true
    );
  }

  /**
   * 删除日程
   * Delete event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<FeishuResponse<void>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
      },
      true
    );
  }

  // ==================== 订阅相关 ====================

  /**
   * 订阅日历
   * Subscribe to calendar
   */
  async subscribeCalendar(calendarId: string): Promise<FeishuResponse<void>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/subscribe`,
      {
        method: 'POST',
      },
      true
    );
  }

  /**
   * 取消订阅日历
   * Unsubscribe from calendar
   */
  async unsubscribeCalendar(calendarId: string): Promise<FeishuResponse<void>> {
    return this.request(
      `/open-apis/calendar/v4/calendars/${calendarId}/subscribe`,
      {
        method: 'DELETE',
      },
      true
    );
  }

  // ==================== 忙碌状态 ====================

  /**
   * 查询用户忙碌状态
   * Get user free/busy status
   */
  async getFreeBusy(params: GetFreeBusyParams): Promise<FeishuResponse<{
    free_busy_status_list: Array<{
      calendar_id: string;
      busy_time_list: Array<{
        start_timestamp: string;
        end_timestamp: string;
      }>;
    }>;
  }>> {
    return this.request(
      '/open-apis/calendar/v4/free_busy_status/query',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true
    );
  }

  /**
   * 获取日程可用时间
   * Get available time slots
   */
  async getAvailableTime(params: {
    calendar_id: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }): Promise<FeishuResponse<{
    available_time_list: Array<{
      start_timestamp: string;
      end_timestamp: string;
    }>;
  }>> {
    return this.request(
      '/open-apis/calendar/v4/available_time/query',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      true
    );
  }
}
