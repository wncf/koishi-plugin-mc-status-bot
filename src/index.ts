import { Context, Schema } from "koishi";
import { initDataBase } from "./model/server";
import { initMcBot } from "./utils";
import { registerCommands } from "./command";

export const name = "mc-status-bot";

export interface Config {
  adminUsers: string[];
  groupKeep: boolean;
}
export const inject = ["database"];
export const Config: Schema<Config> = Schema.object({
  adminUsers: Schema.array(Schema.string()).description(
    "配置能够操作mc服务器的用户id"
  ),
  groupKeep: Schema.boolean()
    .default(false)
    .description("开启后在哪里添加的服务器就只能在哪里看到"),
});

export async function apply(ctx: Context, config: Config) {
  // write your plugin here
  initDataBase(ctx);
  initMcBot.getInstance(ctx);
  // 添加中间件过滤私聊消息
  ctx.middleware((session, next) => {
    // 如果消息不是来自群聊，直接返回，不继续处理
    if (!session.guildId) {
      session.send("该指令只能在群聊中使用。");
      return;
    }
    // 继续处理消息
    return next();
  }, true);
  registerCommands(ctx, config);
}
