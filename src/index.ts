#!/usr/bin/env node

/**
 * 飞书日历 MCP 服务器
 * Feishu Calendar MCP Server
 *
 * 使用方法 (Usage):
 * 需要设置环境变量:
 * - FEISHU_APP_ID: 飞书应用 ID
 * - FEISHU_APP_SECRET: 飞书应用密钥
 * - FEISHU_USER_ACCESS_TOKEN: 用户访问令牌 (可选，某些操作需要)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { FeishuCalendarClient } from './client.js';
import { FeishuConfig } from './config.js';
import { OAuthHelper } from './oauth.js';

// 从环境变量获取配置
function getConfigFromEnv(): FeishuConfig {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const userAccessToken = process.env.FEISHU_USER_ACCESS_TOKEN;
  const refreshToken = process.env.FEISHU_REFRESH_TOKEN;
  const useAppToken = process.env.FEISHU_USE_APP_TOKEN === 'true';

  if (!appId || !appSecret) {
    throw new Error(
      'FEISHU_APP_ID and FEISHU_APP_SECRET environment variables are required'
    );
  }

  return {
    appId,
    appSecret,
    userAccessToken,
    refreshToken,
    useAppToken,
  };
}

/**
 * 检查是否需要授权，如果需要则启动 OAuth 流程
 */
async function ensureAuth(config: FeishuConfig): Promise<void> {
  // 如果已经有 token，直接返回
  if (config.userAccessToken || config.refreshToken) {
    return;
  }

  // 没有配置 token，输出友好提示（不阻塞 MCP 启动）
  console.error('\n=== 飞书日历 MCP 配置提示 ===');
  console.error('\n检测到未配置访问令牌。请使用以下方式之一获取：');
  console.error('\n方式一：运行授权脚本（推荐）');
  console.error('  npm run auth');
  console.error('\n方式二：手动配置 refresh_token');
  console.error('  访问 https://open.feishu.cn/api-explorer/');
  console.error('  选择 authen → getUserAccessTokenBy3rdApp');
  console.error('  将返回的 refresh_token 添加到配置中\n');
  console.error('配置后重启 MCP 服务器即可使用\n');
}

// 定义工具列表
const TOOLS: Tool[] = [
  // 日历相关工具
  {
    name: 'feishu_get_calendar_list',
    description: '查询所有飞书日历。当用户说"查询日历"、"查看日历"、"我的日历"、"有哪些日历"等类似话语时使用。',
    inputSchema: {
      type: 'object',
      properties: {
        page_size: {
          type: 'number',
          description: '每页数量 (Page size), 默认 50',
        },
        page_token: {
          type: 'string',
          description: '分页令牌 (Page token for pagination)',
        },
      },
    },
  },
  {
    name: 'feishu_get_calendar',
    description: '获取指定飞书日历的详细信息，需要提供日历 ID',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
      },
      required: ['calendar_id'],
    },
  },
  {
    name: 'feishu_create_calendar',
    description: '创建新的飞书日历。当用户说"创建日历"、"新建日历"时使用。',
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: '日历名称 (Calendar name/title)',
        },
        description: {
          type: 'string',
          description: '日历描述 (Calendar description)',
        },
        color: {
          type: 'string',
          description: '日历颜色 (Calendar color, hex format)',
        },
      },
      required: ['summary'],
    },
  },
  {
    name: 'feishu_update_calendar',
    description: '更新飞书日历信息',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        summary: {
          type: 'string',
          description: '日历名称 (Calendar name/title)',
        },
        description: {
          type: 'string',
          description: '日历描述 (Calendar description)',
        },
        color: {
          type: 'string',
          description: '日历颜色 (Calendar color, hex format)',
        },
      },
      required: ['calendar_id'],
    },
  },
  {
    name: 'feishu_delete_calendar',
    description: '删除飞书日历',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
      },
      required: ['calendar_id'],
    },
  },
  // 日程事件相关工具
  {
    name: 'feishu_get_event_list',
    description: '查询飞书日程/事件列表。当用户说"查看日程"、"今天的安排"、"查询日程"、"有哪些会议"等类似话语时使用。需要提供日历 ID。',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        page_size: {
          type: 'number',
          description: '每页数量 (Page size)',
        },
        page_token: {
          type: 'string',
          description: '分页令牌 (Page token)',
        },
        start_time: {
          type: 'string',
          description: '开始时间，Unix 时间戳，单位毫秒 (Start time timestamp in ms)',
        },
        end_time: {
          type: 'string',
          description: '结束时间，Unix 时间戳，单位毫秒 (End time timestamp in ms)',
        },
      },
      required: ['calendar_id'],
    },
  },
  {
    name: 'feishu_get_event',
    description: '获取飞书日程详情',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        event_id: {
          type: 'string',
          description: '日程 ID (Event ID)',
        },
      },
      required: ['calendar_id', 'event_id'],
    },
  },
  {
    name: 'feishu_create_event',
    description: '创建飞书日程/会议。当用户说"创建日程"、"新建会议"、"安排会议"、"添加日程"、"预约"等类似话语时使用。需要提供日历ID、标题、开始时间和结束时间。',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        summary: {
          type: 'string',
          description: '日程标题 (Event title)',
        },
        description: {
          type: 'string',
          description: '日程描述 (Event description)',
        },
        start_time: {
          type: 'string',
          description: '开始时间，Unix 时间戳，单位秒 (Start time timestamp in seconds)',
        },
        end_time: {
          type: 'string',
          description: '结束时间，Unix 时间戳，单位秒 (End time timestamp in seconds)',
        },
        timezone: {
          type: 'string',
          description: '时区，如 Asia/Shanghai (Timezone)',
          default: 'Asia/Shanghai',
        },
        location: {
          type: 'string',
          description: '地点 (Location)',
        },
        attendee_ability: {
          type: 'string',
          description: '参与者能力 (Attendee ability)',
          enum: ['can_see_others', 'cannot_see_others'],
        },
        visibility: {
          type: 'string',
          description: '可见性 (Visibility)',
          enum: ['default', 'public', 'private'],
        },
        free_busy_status: {
          type: 'string',
          description: '忙碌状态 (Free/Busy status)',
          enum: ['busy', 'free'],
        },
        attendees: {
          type: 'array',
          description: '参与者列表 (Attendees)',
          items: {
            type: 'object',
            properties: {
              user_id: {
                type: 'string',
                description: '用户 ID (User ID)',
              },
              type: {
                type: 'string',
                description: '类型 (Type)',
                enum: ['user', 'resource', 'external'],
              },
            },
            required: ['user_id', 'type'],
          },
        },
      },
      required: ['calendar_id', 'summary', 'start_time', 'end_time'],
    },
  },
  {
    name: 'feishu_update_event',
    description: '更新飞书日程',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        event_id: {
          type: 'string',
          description: '日程 ID (Event ID)',
        },
        summary: {
          type: 'string',
          description: '日程标题 (Event title)',
        },
        description: {
          type: 'string',
          description: '日程描述 (Event description)',
        },
        start_time: {
          type: 'string',
          description: '开始时间，Unix 时间戳，单位毫秒 (Start time timestamp in ms)',
        },
        end_time: {
          type: 'string',
          description: '结束时间，Unix 时间戳，单位毫秒 (End time timestamp in ms)',
        },
        location: {
          type: 'string',
          description: '地点 (Location)',
        },
      },
      required: ['calendar_id', 'event_id'],
    },
  },
  {
    name: 'feishu_delete_event',
    description: '删除日程 (Delete event)',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        event_id: {
          type: 'string',
          description: '日程 ID (Event ID)',
        },
      },
      required: ['calendar_id', 'event_id'],
    },
  },
  // 订阅相关工具
  {
    name: 'feishu_subscribe_calendar',
    description: '订阅日历 (Subscribe to calendar)',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
      },
      required: ['calendar_id'],
    },
  },
  {
    name: 'feishu_unsubscribe_calendar',
    description: '取消订阅日历 (Unsubscribe from calendar)',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
      },
      required: ['calendar_id'],
    },
  },
  // 忙碌状态相关工具
  {
    name: 'feishu_get_free_busy',
    description: '查询用户忙碌状态 (Get user free/busy status)',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_ids: {
          type: 'array',
          description: '日历 ID 列表 (List of calendar IDs)',
          items: { type: 'string' },
        },
        start_time: {
          type: 'string',
          description: '开始时间，Unix 时间戳，单位毫秒 (Start time timestamp in ms)',
        },
        end_time: {
          type: 'string',
          description: '结束时间，Unix 时间戳，单位毫秒 (End time timestamp in ms)',
        },
      },
      required: ['calendar_ids', 'start_time', 'end_time'],
    },
  },
  {
    name: 'feishu_get_available_time',
    description: '获取可用时间段 (Get available time slots)',
    inputSchema: {
      type: 'object',
      properties: {
        calendar_id: {
          type: 'string',
          description: '日历 ID (Calendar ID)',
        },
        start_time: {
          type: 'string',
          description: '开始时间，Unix 时间戳，单位毫秒 (Start time timestamp in ms)',
        },
        end_time: {
          type: 'string',
          description: '结束时间，Unix 时间戳，单位毫秒 (End time timestamp in ms)',
        },
        duration_minutes: {
          type: 'number',
          description: '需要的时长（分钟）(Duration in minutes)',
        },
      },
      required: ['calendar_id', 'start_time', 'end_time', 'duration_minutes'],
    },
  },
];

async function main() {
  // 获取配置
  const config = getConfigFromEnv();

  // 检查是否需要授权
  await ensureAuth(config);

  // 创建 MCP 服务器
  const server = new Server(
    {
      name: 'feishu-calendar-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 创建客户端
  const client = new FeishuCalendarClient(config);

  // 处理工具列表请求
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // 处理工具调用请求
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Missing arguments' }),
          },
        ],
        isError: true,
      };
    }

    try {
      let result;

      switch (name) {
        // 日历相关
        case 'feishu_get_calendar_list':
          result = await client.getCalendarList(args);
          break;
        case 'feishu_get_calendar':
          result = await client.getCalendar(args.calendar_id as string);
          break;
        case 'feishu_create_calendar':
          result = await client.createCalendar({
            summary: args.summary as string,
            description: args.description as string | undefined,
            color: args.color as string | undefined,
          });
          break;
        case 'feishu_update_calendar':
          result = await client.updateCalendar(args.calendar_id as string, {
            summary: args.summary as string | undefined,
            description: args.description as string | undefined,
            color: args.color as string | undefined,
          });
          break;
        case 'feishu_delete_calendar':
          result = await client.deleteCalendar(args.calendar_id as string);
          break;

        // 日程事件相关
        case 'feishu_get_event_list':
          result = await client.getEventList(args.calendar_id as string, {
            page_size: args.page_size as number | undefined,
            page_token: args.page_token as string | undefined,
            start_time: args.start_time as string | undefined,
            end_time: args.end_time as string | undefined,
          });
          break;
        case 'feishu_get_event':
          result = await client.getEvent(
            args.calendar_id as string,
            args.event_id as string
          );
          break;
        case 'feishu_create_event':
          result = await client.createEvent({
            calendar_id: args.calendar_id as string,
            summary: args.summary as string,
            description: args.description as string | undefined,
            start_time: { timestamp: args.start_time as string },
            end_time: { timestamp: args.end_time as string },
            location: args.location as string | undefined,
            attendee_ability: args.attendee_ability as string | undefined,
            visibility: args.visibility as string | undefined,
            attendees: args.attendees as any,
          });
          break;
        case 'feishu_update_event':
          result = await client.updateEvent(
            args.calendar_id as string,
            args.event_id as string,
            {
              summary: args.summary as string | undefined,
              description: args.description as string | undefined,
              start_time: args.start_time
                ? { timestamp: args.start_time as string }
                : undefined,
              end_time: args.end_time
                ? { timestamp: args.end_time as string }
                : undefined,
              location: args.location as string | undefined,
            }
          );
          break;
        case 'feishu_delete_event':
          result = await client.deleteEvent(
            args.calendar_id as string,
            args.event_id as string
          );
          break;

        // 订阅相关
        case 'feishu_subscribe_calendar':
          result = await client.subscribeCalendar(args.calendar_id as string);
          break;
        case 'feishu_unsubscribe_calendar':
          result = await client.unsubscribeCalendar(args.calendar_id as string);
          break;

        // 忙碌状态相关
        case 'feishu_get_free_busy':
          result = await client.getFreeBusy({
            calendar_ids: args.calendar_ids as string[],
            start_time: args.start_time as string,
            end_time: args.end_time as string,
          });
          break;
        case 'feishu_get_available_time':
          result = await client.getAvailableTime({
            calendar_id: args.calendar_id as string,
            start_time: args.start_time as string,
            end_time: args.end_time as string,
            duration_minutes: args.duration_minutes as number,
          });
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // 启动服务器
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Feishu Calendar MCP Server running');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
