import { Context, Schema } from "koishi";
import { initDataBase } from "./model/server";
import { initMcBot } from "./utils";
import { registerCommands } from "./command";

export const name = "mc-status-bot";

export interface Config {
  adminUsers: string[];
}
export const inject = ["database"];
export const Config: Schema<Config> = Schema.object({
  adminUsers: Schema.array(Schema.string())
    .description("配置能够操作mc服务器的用户id"),
});

export async function apply(ctx: Context, config: Config) {
  // write your plugin here
  initDataBase(ctx);
  initMcBot.getInstance(ctx);
  registerCommands(ctx, config);
}
