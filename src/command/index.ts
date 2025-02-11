import { Context } from "koishi";
import { IfindArg, guoupArg, initMcBot, varkeys } from "../utils";
import { mcFormat, serverListFormat } from "../utils/mcFormat";
import { Config } from "../index";

export const registerCommands = (ctx: Context, config: Config) => {
  const mcBot = initMcBot.getInstance();
  const { groupKeep } = config;
  const mcComand = ctx.command("mc", {
    authority: 1,
  });
  mcComand.option("name", "[服务器名称]").action(async (_, arg) => {
    try {
      if (arg) {
        if (!_.session.guildId) return;
        const findArg: IfindArg = guoupArg(
          groupKeep,
          { name: arg },
          { groupId: _.session.event.channel.id }
        );
        const server = await mcBot.findServer(findArg);
        const oneServer = server[0];
        if (!oneServer) return `未找到${arg}服务器`;
        const address = `${oneServer.ip}:${oneServer.port}`;
        let resultText = "";
        await mcBot
          .pingOneServer(oneServer)
          .then((res) => {
            resultText = mcFormat(oneServer.name, address, {
              ...res,
              latency: res.latency,
            });
          })
          .catch((err) => {
            resultText = mcFormat(oneServer.name, address, {
              rejected: true,
              ...err,
            });
          });
        return resultText;
      } else {
        const findArg: IfindArg = guoupArg(
          groupKeep,
          {},
          { groupId: _.session.event.channel.id }
        );
        const data = await mcBot.pingServerList(findArg);
        if (!data.length) return "您还没添加任何服务器";
        let serverStrlist = [];
        data.forEach((item) => {
          const { name, address, latency, ...res } = item;
          serverStrlist.push(
            mcFormat(name, address, {
              ...res,
              latency,
            })
          );
        });
        return serverStrlist.join("***********************\n");
      }
    } catch (e) {
      console.log(e, "出现错误");
    }
  });

  mcComand
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
          if (!formatPort || formatPort < 0 || formatPort > 65536)
            return "服务器端口不合法";
          const findArg: IfindArg = guoupArg(
            groupKeep,
            { name: name },
            { groupId: _.session.event.channel.id }
          );
          const findServer = await mcBot.findServer(findArg);
          let server = null;
          if (!findServer.length) {
            server = await mcBot.upsert({
              name: name,
              ip: ip,
              groupId: _.session.event.channel.id,
              port: formatPort,
            });
          } else {
            server = await mcBot.upsert({
              id: findServer[0].id,
              name: name,
              ip: ip,
              groupId: _.session.event.channel.id,
              port: formatPort,
            });
          }
          if (!server) {
            return "操作失败";
          } else if (server.inserted) {
            return "新增成功";
          } else if (server.matched) {
            return "修改成功";
          }
        } catch (err) {
          console.log(err, "出现错误");
        }
    });
  mcComand
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
        console.log(err, "出现错误");
      }
    });

  mcComand.subcommand(".list").action(async (_) => {
    try {
      if (!_.session.guildId) return;
      const data = await mcBot.findServer({
        groupId: _.session.guildId,
      });
      return serverListFormat(data);
    } catch (err) {
      console.log(err, "出现错误");
    }
  });
  // 临时ping
  mcComand
    .subcommand(".ping")
    .option("address", "<地址:端口>")
    .action(async (_, address) => {
      try {
        if (!address) return "请提供服务器的地址:端口";
        const [ip, port] = address.split(":");
        let formatPort = 25565;
        if (port) formatPort = Number(port);
        let resultText = "";
        await mcBot
          .pingOneServer({ ip, port: formatPort })
          .then((res) => {
            resultText = mcFormat("", address, {
              ...res,
              latency: res.latency,
            });
          })
          .catch((err) => {
            resultText = mcFormat("", address, {
              rejected: true,
              ...err,
            });
          });
        return resultText;
      } catch (err) {
        console.log(err, "出现错误");
      }
    });
};
