import { Context } from "koishi";

export interface ImcServer {
  id?: number;
  name: string;
  groupId: string;
  ip: string;
  port?: number;
}

declare module "koishi" {
  interface Tables {
    mcServerList: ImcServer;
  }
}

export const initDataBase = (ctx: Context) => {
  ctx.model.extend(
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
      groupId: {
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
    },
    {
      primary: "id",
      autoInc: true,
      unique: ["name"],
    }
  );
};
