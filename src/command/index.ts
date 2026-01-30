import { Context } from "koishi";
import type { Session } from "koishi";
import { IfindArg, guoupArg, initMcBot, varkeys } from "../utils";
import { mcFormat, serverListFormat } from "../utils/mcFormat";
import { Config } from "../index";
import type { ImcServer } from "../model/server";
import { onEnableQuery, queryResultFormat } from "../utils/enableQuery";

const getUniqueId = (session: Session) => {
  return session.event.channel.id || session.event.user.id;
}

export const registerCommands = (ctx: Context, config: Config) => {
  const mcBot = initMcBot.getInstance();
  const { groupKeep } = config;
  const mcComand = ctx.command("mc", {
    authority: 1,
  });
  // 查看某个/全部的服务器状态
  mcComand.option("name", "[服务器名称]").action(async (_, arg) => {
    try {
      const uniqueId = getUniqueId(_.session);
      const findArg: IfindArg = groupKeep
        ? { serverId: uniqueId }
        : {};
      if (arg) {
        const server = await mcBot.findServer({
          name: arg,
          ...findArg
        });
        const oneServer = server[0];
        if (!oneServer) return `未找到${arg}服务器`;
        if (oneServer.enableQuery) {
          try {
            const queryResult = await onEnableQuery(oneServer.ip, oneServer.port)
            const resultText = queryResultFormat(queryResult, config.descriptionFormatting);
            return resultText;
          } catch (err) {
            console.log(err, 'enableQuery error');
            return `出现错误:${err.message}`
          }

        } else {
          const address = `${oneServer.ip}:${oneServer.port}`;
          let resultText = "";
          await mcBot
            .pingOneServer(oneServer)
            .then((res) => {
              resultText = mcFormat(
                oneServer.name,
                address,
                {
                  ...res,
                  latency: res.latency,
                },
                config
              );
            })
            .catch((err) => {
              resultText = mcFormat(oneServer.name, address, {
                rejected: true,
                ...err,
              });
            });
          return resultText;
        }
      } else {
        const data = await mcBot.pingServerList(findArg, config);
        if (!data.length) return "您还没添加任何服务器";
        let serverStrlist = [];
        data.forEach((item) => {
          const { name, address, latency, ...res } = item;
          serverStrlist.push(
            mcFormat(
              name,
              address,
              {
                ...res,
                latency,
              },
              config
            )
          );
        });
        return serverStrlist.join("***********************\n");
      }
    } catch (e) {
      console.log(e, "出现错误");
    }
  });
  // 添加/修改服务器
  mcComand
    .subcommand(".set")
    .option("name", "<名称>")
    .option("address", "<地址:端口>")
    .option("enableQuery", "[true/false] 是否启用Query协议")
    .action(async (_, name, address, enableQuery) => {

      const uniqueId = getUniqueId(_.session);
      const serverId = groupKeep ? uniqueId : ""

      if (!config.adminUsers.includes(String(_.session.event.user.id)))
        return "您没有操作服务器的权限";
      if (varkeys.includes(name)) return "服务器名称不合法";
      if (_.session.content)
        try {
          if (!name || !address) return "请提供服务器名称和地址:端口";
          const [ip, port] = address.split(":");
          // 端口校验
          let formatPort = port ? Number(port) : 25565;
          if (!formatPort || formatPort < 0 || formatPort > 65536) {
            return "服务器端口不合法";
          }
          const qeruyPrams = {
            name: name,
          } as IfindArg;

          if (groupKeep) qeruyPrams.serverId = serverId;

          // 查找是否存在该服务器
          const findServer = await mcBot.findServer(qeruyPrams);

          let server = null;
          const parmas = {
            name: name,
            ip: ip,
            port: formatPort,
            enableQuery: Boolean(enableQuery),
          } as ImcServer;
          if (groupKeep) {
            parmas.serverId = serverId;
          }
          // 插入数据库
          if (findServer.length) {
            parmas.id = findServer[0].id;
          }
          server = await mcBot.upsert(parmas);

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
  // 删除服务器
  mcComand
    .subcommand(".del")
    .option("name", "<名称>")
    .action(async (_, name) => {
      try {
        if (!config.adminUsers.includes(String(_.session.event.user.id)))
          return "您没有操作服务器的权限";
        if (!name) return "请提供服务器名称";
        const uniqueId = getUniqueId(_.session);

        const findArg: IfindArg = { name };
        if (groupKeep) findArg.serverId = uniqueId;
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
  // 查看服务器列表
  mcComand.subcommand(".list").action(async (_) => {
    try {
      const uniqueId = getUniqueId(_.session);
      const prams: IfindArg = {};
      if (groupKeep) prams.serverId = uniqueId;
      const data = await mcBot.findServer(prams);
      return serverListFormat(data);
    } catch (err) {
      console.log(err, "出现错误");
    }
  });
  // 临时ping服务器
  mcComand
    .subcommand(".ping")
    .option("address", "<地址:端口>")
    .option("enableQuery", "[true/false] 是否启用Query协议")
    .action(async (_, address, enableQuery) => {
      try {
        if (!address) return "请提供服务器的地址:端口";
        const [ip, port] = address.split(":");
        let formatPort = 25565;
        if (port) formatPort = Number(port);
        if (enableQuery) {
          const queryResult = await onEnableQuery(ip, Number(port));
          const resultText = queryResultFormat(queryResult, config.descriptionFormatting);
          return resultText;
        } else {
          let resultText = "";
          await mcBot
            .pingOneServer({ ip, port: formatPort })
            .then((res) => {
              resultText = mcFormat(
                "",
                address,
                {
                  ...res,
                  latency: res.latency,
                },
                config
              );
            })
            .catch((err) => {
              resultText = mcFormat("", address, {
                rejected: true,
                ...err,
              });
            });
          return resultText;
        }
      }
      catch (err) {
        console.log(err, "出现错误");
        return `出现错误:${err.message}`
      }
    });
};
