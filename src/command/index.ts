import { Context } from "koishi";
import { IfindArg, initMcBot, varkeys } from "../utils";
import { mcFormat } from "../utils/mcFormat";
import { Config } from "../index";

export const registerCommands = (ctx: Context, config: Config) => {
  const mcBot = initMcBot.getInstance();
  const { groupKeep } = config;
  ctx
    .command("mc")
    .option("name", "[服务器名称]")
    .action(async (_, arg) => {
      try {
        if (arg) {
          if (!_.session.guildId) return;
          const findArg: IfindArg = {
            name: arg,
          };
          if (groupKeep) findArg.groupId = _.session.event.channel.id;
          const server = await mcBot.findServer(findArg);
          const oneServer = server[0];
          if (!oneServer) return `未找到${arg}服务器`;
          const address = `${oneServer.ip}:${oneServer.port}`;
          let resultText = "";
          await mcBot
            .pingOneServer(oneServer)
            .then((res) => {
              resultText = mcFormat(oneServer.name, address, res.status);
            })
            .catch((err) => {
              resultText = mcFormat(oneServer.name, address, {
                rejected: true,
                ...err,
              });
            });
          return resultText;
        } else {
          const findArg: IfindArg = {};
          if (groupKeep) findArg.groupId = _.session.event.channel.id;
          const data = await mcBot.pingServerList(findArg);
          if (!data.length) return "您还没添加任何服务器";
          let serverStrlist = [];
          data.forEach((item) => {
            const { name, address, status } = item;
            serverStrlist.push(mcFormat(name, address, status));
          });
          return serverStrlist.join("__________\n");
        }
      } catch (e) {
        console.log(e, "出现错误");
      }
    });

  ctx
    .command("mc")
    .subcommand(".set")
    .option("name", "<名称>")
    .option("address", "<地址:端口>")
    .action(async (_, name, address) => {
      if (!_.session.guildId) return;
      if (!config.adminUsers.includes(String(_.session.event.user.id)))
        return "您没有操作服务器的权限";
      if (varkeys.includes(name)) return "服务器名称不合法";
      if (_.session.content)
        try {
          if (!name || !address) return "请提供服务器名称和地址:端口";
          const [ip, port] = address.split(":");
          let formatPort = 25565;
          if (port) formatPort = Number(port);
          if (!formatPort) return "服务器端口不合法";
          const server = await mcBot.upsert({
            name: name,
            ip: ip,
            groupId: _.session.event.channel.id,
            port: formatPort,
          });
          if (server.inserted) {
            return "新增成功";
          } else if (server.matched) {
            return "修改成功";
          } else {
            return "操作失败";
          }
        } catch (err) {
          if (err.message.includes("UNIQUE constraint failed")) {
            return "服务器名称已存在，请使用其他名称";
          } else {
            console.log(err, "出现错误");
          }
        }
    });
  ctx
    .command("mc")
    .subcommand(".del")
    .option("name", "<名称>")
    .action(async (_, name) => {
      try {
        if (!_.session.guildId) return;
        if (!config.adminUsers.includes(String(_.session.event.user.id)))
          return "您没有操作服务器的权限";
        if (!name) return "请提供服务器名称";

        const findArg: IfindArg = { name };
        if (groupKeep) findArg.groupId = _.session.event.channel.id;
        const { matched } = await mcBot.delteByName(findArg);
        if (matched) {
          return "删除成功";
        } else {
          return "没有此名称的服务器";
        }
      } catch (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return "名称已存在，请使用其他名称";
        } else {
          console.log(err, "出现错误");
        }
      }
    });
};
