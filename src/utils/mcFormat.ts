import { ImcServer } from "../model/server";
const transformText = (obj: any) => {
  let str = "";
  if (obj.favicon) str += `<image src="${obj.favicon}"/>`;
  if (obj.name) str = str + `${obj.name}[${obj.address}]\n`;
  if (obj.description && obj.description.text) {
    str = str + `描述：${obj.description.text}\n`;
    // 兼容1.17.10 描述
  } else if (typeof obj.description === "string") {
    str = str + `描述：${obj.description}\n`;
  }
  if (obj.latency) str = str + `延迟：${obj.latency}ms\n`;
  if (obj.version && obj.version.name)
    str = str + `版本：${obj.version.name}\n`;
  if (obj.players) {
    const players = obj.players;
    if (players.max) str += `在线人数：${players.online}/${players.max}\n`;
    if (players.sample)
      str += `当前在线：${players.sample
        .map((item: any) => `${item.name}`)
        .join(",")}\n`;
  }
  // 兼容1.12.2
  if (obj.modinfo && obj.modinfo.modList && obj.modinfo.modList.length) {
    str = str + `mod数：${obj.modinfo.modList.length}\n`;
    // 高版本兼容
  } else if (obj.forgeData && obj.forgeData.mods && obj.forgeData.mods.length) {
    str = str + `mod数：${obj.forgeData.mods.length}\n`;
  }

  if (obj.rejected) {
    if (obj.code) str = str + `请求失败：${obj.code}\n`;
    if (obj.errno) str = str + `错误代码：${obj.errno}\n`;
    str = str + `服务器地址错误或者服务器未启动\n`;
  }
  return str;
};
export const mcFormat = (name: string, address: string, server: any) => {
  if (!server) return "";
  return transformText({
    name,
    address,
    ...server,
  });
};
export const serverListFormat = (serverList: ImcServer[]) => {
  const list = serverList.map((item) => {
    let str = "";
    str += `服务器名称： ${item.name}\n`;
    str += `服务器ip： ${item.ip}\n`;
    str += `服务器端口： ${item.port}\n`;
    return str;
  });
  return list.join("***********************\n");
};
