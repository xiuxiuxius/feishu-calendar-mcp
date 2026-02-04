import 'dotenv/config';
import { FeishuCalendarClient } from './src/client.js';

async function main() {
  const config = {
    appId: process.env.FEISHU_APP_ID!,
    appSecret: process.env.FEISHU_APP_SECRET!,
    userAccessToken: process.env.FEISHU_USER_ACCESS_TOKEN!,
  };

  const client = new FeishuCalendarClient(config);
  const result = await client.getCalendarList();

  console.log(JSON.stringify(result, null, 2));
}

main();
