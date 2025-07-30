import type { ImcServer } from "./../model/server";
import { Context } from "koishi";
import { mcPing } from "./ping";
export interface IfindArg {
  name?: string;
  groupId?: string;
}
export const varkeys = [
  "name",
  "list",
  "update",
  "add",
  "delete",
  "remove",
  "inset",
  "upsert",
  "set",
  "help",
];
export class initMcBot {
  ctx: Context;
  private static instance: initMcBot;
  private constructor(ctx: Context) {
    this.ctx = ctx;
  }
  public static getInstance(ctx?: Context): initMcBot {
    if (!initMcBot.instance) {
      if (!ctx) {
        throw new Error("实例初始化失败：缺少ctx");
      }
      initMcBot.instance = new initMcBot(ctx);
    }
    return initMcBot.instance;
  }
  findServer(findArg: IfindArg) {
    return this.ctx.database.get("mcServerList", findArg);
  }
  delteByName(findArg: IfindArg) {
    return this.ctx.database.remove("mcServerList", findArg);
  }
  upsert(server: ImcServer) {
    return this.ctx.database.upsert("mcServerList", [server]);
  }
  async pingServerList(findArg: IfindArg) {
    const serverList = await this.findServer(findArg);
    const promiseList = [];
    let result = [];
    for (let item of serverList) {
      promiseList.push(
        mcPing(
          {
            host: item.ip,
            port: item.port,
          },
          (error, result) => {
            if (error) throw error;
            return Promise.resolve(result);
          }
        )
      );
    }
    await Promise.allSettled(promiseList).then((res) => {
      res.forEach((resArg, index) => {
        if (resArg.status === "fulfilled") {
          result.push({
            name: serverList[index].name,
            address: `${serverList[index].ip}:${serverList[index].port}`,
            latency: resArg.value.latency,
            ...resArg.value,
          });
        } else {
          result.push({
            name: serverList[index].name,
            address: `${serverList[index].ip}:${serverList[index].port}`,
            status: {
              rejected: true,
              ...resArg.reason,
            },
          });
        }
      });
    });
    return result;
  }
  async pingOneServer(opt: ImcServer): Promise<any> {
    return mcPing({
      host: opt.ip,
      port: opt.port,
    });
  }
}

// 如果第一个参数为true,就合并后两则对象，否则就返回第二个对象
export const guoupArg = (
  groupKeep: boolean,
  arg: IfindArg = {},
  obj: any = {}
) => {
  if (groupKeep) return { ...arg, ...obj };
  return arg;
};

export function removeMinecraftFormatting(text: string): string {
  if (typeof text !== "string") return "";
  // 1. 去除 Minecraft 格式代码
  text = text.replace(/§[0-9a-fk-or]/gi, "");
  // 2. 去除插件自定义标签（示例）
  text = text.replace(/<[^>]*>|{[^}]*}|%[^%]+%/g, "");
  // 3. 去除不可见控制字符
  text = text.replace(
    /[\u0000-\u001F\u007F\u0080-\u009F\u200B-\u200D\uFEFF]/g,
    ""
  );
  return text.trim();
}
