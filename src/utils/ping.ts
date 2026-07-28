"use strict";
import varint from "varint";
import net from "net";
import dns, { Resolver } from "dns/promises";
import type { SrvRecord } from "dns";

const DEFAULT_PORT = 25565;
const defaultProtocol = 767;

/** 系统 DNS 不可用时（如 Node 指到 127.0.0.1 拒连）的公共解析器回退 */
const FALLBACK_DNS_SERVERS = ["223.5.5.5", "8.8.8.8", "1.1.1.1"];

export type McPingOptions = {
  host?: string;
  port?: number;
  protocol?: number;
  version?: string;
  closeTimeout?: number;
  /** 是否按客户端流程解析 SRV，默认 true */
  enableSRV?: boolean;
};

/** TCP 连接目标 + handshake 里的 server address */
type ResolvedAddress = {
  host: string;
  port: number;
  /** 玩家输入的域名/地址，handshake 仍用它（反代/虚拟主机依赖） */
  serverName: string;
};

export function mcPing(
  options: McPingOptions,
  cb?: (err: any, data: any) => void
) {
  const pingPromise = ping(options);
  if (cb) {
    pingPromise
      .then((d) => {
        cb(null, d);
      })
      .catch((err) => {
        cb(err, null);
      });
  }
  return pingPromise;
}

function encodeString(str: string) {
  const strBuf = Buffer.from(str, "utf8");
  const lenBuf = Buffer.from(varint.encode(strBuf.length));
  return Buffer.concat([lenBuf, strBuf]);
}

function encodeVarInt(value: number) {
  return Buffer.from(varint.encode(value));
}

function createPacket(id: number, data: Buffer) {
  const idBuf = encodeVarInt(id);
  const packetData = Buffer.concat([idBuf, data]);
  const lengthBuf = encodeVarInt(packetData.length);
  return Buffer.concat([lengthBuf, packetData]);
}

const isIpAddress = (host: string) => net.isIP(host) !== 0;

const stripTrailingDot = (name: string) => name.replace(/\.$/, "");

/**
 * RFC 2782：先取最低 priority，同 priority 内按 weight 加权随机
 * （与 Minecraft 客户端选 SRV 记录方式一致）
 */
function pickSrvRecord(records: SrvRecord[]): SrvRecord {
  const sorted = [...records].sort((a, b) => a.priority - b.priority);
  const minPriority = sorted[0].priority;
  const candidates = sorted.filter((r) => r.priority === minPriority);
  const totalWeight = candidates.reduce((sum, r) => sum + r.weight, 0);

  if (totalWeight === 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  let cursor = Math.random() * totalWeight;
  for (const record of candidates) {
    cursor -= record.weight;
    if (cursor <= 0) return record;
  }
  return candidates[candidates.length - 1];
}

/**
 * 查 SRV：先走系统 DNS，失败再用公共 DNS（避免 Node 解析器指到本机无效服务）
 */
async function lookupMinecraftSrv(host: string): Promise<SrvRecord[] | null> {
  const name = `_minecraft._tcp.${host}`;

  try {
    const records = await dns.resolveSrv(name);
    if (records?.length) return records;
  } catch {
    // 继续公共 DNS
  }

  try {
    const resolver = new Resolver();
    resolver.setServers(FALLBACK_DNS_SERVERS);
    const records = await resolver.resolveSrv(name);
    if (records?.length) return records;
  } catch {
    // 无 SRV
  }

  return null;
}

/**
 * 对齐游戏客户端解析：
 * 1. 字面量 IP → 直连
 * 2. 显式非 25565 端口 → 直连（玩家写了 host:port）
 * 3. 域名 + 默认端口 → 查 _minecraft._tcp.<host>
 * 4. 无 SRV / 查询失败 → 回退 host:25565
 *
 * handshake 的 server address 始终用原始 host（不是 SRV target）
 */
async function resolveMcAddress(
  host: string,
  port: number,
  enableSRV = true
): Promise<ResolvedAddress> {
  const serverName = host;

  if (!enableSRV || isIpAddress(host) || port !== DEFAULT_PORT) {
    return { host, port, serverName };
  }

  const records = await lookupMinecraftSrv(host);
  if (!records?.length) {
    return { host, port, serverName };
  }

  const best = pickSrvRecord(records);
  return {
    host: stripTrailingDot(best.name),
    port: best.port,
    serverName,
  };
}

async function ping(options: McPingOptions) {
  const inputHost = options.host || "localhost";
  const inputPort = options.port || DEFAULT_PORT;
  const protocolVersion = options.protocol || defaultProtocol;
  const closeTimeout = options.closeTimeout || 20 * 1000;
  const enableSRV = options.enableSRV !== false;

  const { host, port, serverName } = await resolveMcAddress(
    inputHost,
    inputPort,
    enableSRV
  );

  return new Promise((resolve, reject) => {
    const client = net.createConnection({
      host,
      port,
    });
    let buffer = Buffer.alloc(0);
    let startTime: number | null = null;

    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const length = varint.decode(buffer);
        const lengthSize = varint.decode.bytes;
        // 包体未收齐则继续等（避免半包 JSON.parse 失败后空转至超时）
        if (buffer.length < lengthSize + length) return;

        const offset1 = lengthSize;
        const packetId = varint.decode(buffer.slice(offset1));
        const offset2 = offset1 + varint.decode.bytes;
        const stringLength = varint.decode(buffer.slice(offset2));
        const offset3 = offset2 + varint.decode.bytes;

        if (buffer.length < offset3 + stringLength) return;

        const jsonString = buffer
          .slice(offset3, offset3 + stringLength)
          .toString();
        const status = JSON.parse(jsonString);
        const latency = Date.now() - (startTime as number);
        client.end();
        resolve({
          ...status,
          latency,
        });
      } catch {
        // 数据尚不完整或 varint 未读全，等下一包
      }
    };

    client.setTimeout(closeTimeout, () => {
      client.destroy();
      reject(new Error("连接超时"));
    });

    client.on("error", reject);
    client.on("data", onData);
    client.once("connect", () => {
      // handshake：address = 原始域名；port = 实际连接端口（SRV 解析后）
      const handshakeData = Buffer.concat([
        encodeVarInt(protocolVersion),
        encodeString(serverName),
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        Buffer.from([0x01]), // next state: status
      ]);

      const handshakePacket = createPacket(0x00, handshakeData);
      const requestPacket = createPacket(0x00, Buffer.alloc(0));

      startTime = Date.now();
      client.write(Buffer.concat([handshakePacket, requestPacket]));
    });
  });
}
