import type { ImcServer } from "./../model/server";
import { Context } from "koishi";
import { mcPing } from "./ping";
import { onEnableQuery, queryResultFormat } from "./enableQuery";
import { mcFormat } from "./mcFormat";
import { Config } from "..";
import type { FullQueryResponse } from 'minecraft-server-util';

export interface IfindArg {
  name?: string;
  serverId?: string;
}

// 标准 ping 返回类型
export interface IStandardPingResult {
  latency: number;
  description?: string | { text: string };
  version?: { name: string };
  players?: {
    online: number;
    max: number;
    sample?: Array<{ name: string }>;
  };
  favicon?: string;
  modinfo?: {
    modList?: Array<any>;
  };
  forgeData?: {
    mods?: Array<any>;
  };
  [key: string]: any;
}

// Query 协议返回类型
export interface IQueryPingResult extends FullQueryResponse {
  enableQuery: true;
  latency: number;
}

// 服务器状态返回类型（统一格式）
export interface IServerStatusResult {
  name: string;
  address: string;
  latency?: number;
  rejected?: boolean;
  code?: string | number;
  errno?: string | number;
  message?: string;
  enableQuery?: boolean;
  // 标准 ping 字段
  description?: string | { text: string };
  version?: string | { name: string };
  players?: {
    online: number;
    max: number;
    sample?: Array<{ name: string }>;
    list?: string[];
  };
  favicon?: string;
  modinfo?: {
    modList?: Array<any>;
  };
  forgeData?: {
    mods?: Array<any>;
  };
  // Query 协议字段
  motd?: {
    raw: string;
  };
  [key: string]: any;
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
  async pingServerList(findArg: IfindArg, config: Config): Promise<IServerStatusResult[]> {
    const serverList = await this.findServer(findArg);
    const promiseList: Promise<IStandardPingResult | IQueryPingResult>[] = [];

    // 构建 Promise 列表，记录每个 Promise 对应的服务器信息
    for (let item of serverList) {
      if (item.enableQuery) {
        // Query 协议查询
        promiseList.push(
          onEnableQuery(item.ip, item.port || 25565)
            .then((result) => result as IQueryPingResult)
            .catch((err) => {
              // 将错误转换为统一格式，以便后续处理
              throw {
                rejected: true,
                message: err?.message || String(err),
                code: err?.code,
                errno: err?.errno,
                enableQuery: true,
              };
            })
        );
      } else {
        // 标准 ping 查询
        promiseList.push(
          mcPing({
            host: item.ip,
            port: item.port || 25565,
          })
            .then((result) => result as IStandardPingResult)
            .catch((err) => {
              // 将错误转换为统一格式，以便后续处理
              throw {
                rejected: true,
                message: err?.message || String(err),
                code: err?.code,
                errno: err?.errno,
                enableQuery: false,
              };
            })
        );
      }
    }

    // 使用 Promise.allSettled 等待所有请求完成（无论成功或失败）
    const settledResults = await Promise.allSettled(promiseList);

    // 处理结果，统一格式
    const result: IServerStatusResult[] = settledResults.map((settledResult, index) => {
      const server = serverList[index];
      const baseResult: IServerStatusResult = {
        name: server.name || '',
        address: `${server.ip}:${server.port || 25565}`,
        enableQuery: server.enableQuery || false,
      };

      if (settledResult.status === 'fulfilled') {
        const value = settledResult.value;
        // 成功情况：合并服务器状态数据
        const result: IServerStatusResult = {
          ...baseResult,
          ...value,
          latency: value.latency,
        };

        // 如果是 Query 协议返回的数据，需要转换为 mcFormat 能理解的格式
        if (value.enableQuery && 'motd' in value) {
          const queryValue = value as IQueryPingResult;
          // 将 Query 协议的 motd.raw 转换为 description 格式，以便 mcFormat 处理
          result.description = queryValue.motd?.raw || '';
          // 将 Query 协议的 version (string) 转换为 version.name 格式
          if (typeof queryValue.version === 'string') {
            result.version = { name: queryValue.version };
          }
          // 将 Query 协议的 players.list 转换为 players.sample 格式
          if (queryValue.players?.list) {
            result.players = {
              ...queryValue.players,
              sample: queryValue.players.list.map(name => ({ name })),
            };
          }
        }

        return result;
      } else {
        // 失败情况：统一错误格式
        const reason = settledResult.reason;
        return {
          ...baseResult,
          rejected: true,
          message: reason?.message || reason?.toString() || '未知错误',
          code: reason?.code,
          errno: reason?.errno,
        };
      }
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
