const transformText = (obj: any) => {
  let str = "";
  if (obj.name) str = str + `${obj.name}[${obj.address}]\n`;
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
  if (obj.rejected) {
    str = str + `请求失败：${obj.code}\n`;
    str = str + `错误代码：${obj.errno}\n`;
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
