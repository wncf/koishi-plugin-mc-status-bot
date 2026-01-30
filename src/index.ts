import { Context, Schema } from "koishi";
import { initDataBase } from "./model/server";
import { initMcBot } from "./utils";
import { registerCommands } from "./command";

export const name = "mc-status-bot";

export interface Config {
  adminUsers: string[];
  groupKeep: boolean;
  descriptionFormatting: boolean;
}
export const inject = ["database"];
export const Config: Schema<Config> = Schema.object({
  adminUsers: Schema.array(Schema.string()).description(
    "配置能够操作mc服务器的用户id"
  ),
  groupKeep: Schema.boolean()
    .default(true)
    .description("开启后在哪里添加的服务器就只能在哪里看到(开启/关闭已有的服务器需要重新添加才生效)"),
  descriptionFormatting: Schema.boolean()
    .default(true)
    .description("启用后，将移除描述中的颜色代码、插件标签等非纯文本内容。"),
});

export async function apply(ctx: Context, config: Config) {
  initDataBase(ctx);
  initMcBot.getInstance(ctx);
  registerCommands(ctx, config);
}
