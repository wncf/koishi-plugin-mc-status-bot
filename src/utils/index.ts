import type { ImcServer } from "./../model/server";
import { Context } from "koishi";
import mc from "@ahdg/minecraftstatuspinger";
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
        mc.lookup({
          host: item.ip,
          port: item.port,
        })
      );
    }
    await Promise.allSettled(promiseList).then((res) => {
      res.forEach((resArg, index) => {
        if (resArg.status === "fulfilled") {
          result.push({
            name: serverList[index].name,
            address: `${serverList[index].ip}:${serverList[index].port}`,
            status: resArg.value.status,
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
  async pingOneServer(opt: ImcServer) {
    return mc.lookup({
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
