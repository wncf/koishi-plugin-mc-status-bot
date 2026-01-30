import { removeMinecraftFormatting } from './index'
import { queryFull } from 'minecraft-server-util'
import type { FullQueryResponse } from 'minecraft-server-util'
interface IQueryResult extends FullQueryResponse {
  enableQuery: true;
  latency: number;
}
interface queryResultFormatOptions {
  hasForMotd?: boolean;
  description: string;
}
export const onEnableQuery = async (host: string, port: number): Promise<IQueryResult> => {
  let startTime = Date.now(); // 记录开始时间
  return queryFull(host, port, {
    sessionID: Math.floor(Math.random() * 1000000),
    enableSRV: true,
    timeout: 10000,
  }).then((res) => {
    return {
      ...res,
      enableQuery: true,
      latency: Date.now() - startTime,
    }
  })
}
export const queryResultFormat = (queryResult: IQueryResult, options: queryResultFormatOptions) => {
  let str = options.description;
  const moth = queryResult.motd.raw
  str += `描述：${options.hasForMotd ? removeMinecraftFormatting(moth) : moth}\n`;
  str += `延迟：${queryResult.latency}ms\n`;
  str += `版本：${queryResult.version}\n`;
  str += `在线人数：${queryResult.players.online}/${queryResult.players.max}\n`;
  str += `当前在线：${queryResult.players.list.join(',')}\n`;
  return str;
}
