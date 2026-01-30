import { Context } from "koishi";

export interface ImcServer {
  id?: number;
  name?: string;
  serverId?: string;
  ip: string;
  port?: number;
  enableQuery?: boolean;
}

declare module "koishi" {
  interface Tables {
    mcServerList: ImcServer;
  }
}

export const initDataBase = (ctx: Context) => {
  return ctx.model.extend(
    "mcServerList",
    {
      id: {
        type: "integer",
        length: 100,
      },
      name: {
        type: "string",
        length: 20,
        nullable: false,
      },
      serverId: {
        type: "string",
        length: 20,
        nullable: false,
      },
      ip: {
        type: "string",
        length: 20,
        nullable: false,
        initial: "",
      },
      port: {
        type: "integer",
        length: 5,
        initial: 25565,
      },
      enableQuery: {
        type: "boolean",
        initial: false,
      }
    },
    {
      primary: "id",
      autoInc: true,
    }
  );
};
