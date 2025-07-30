"use strict";
import varint from "varint";
import net from "net";
const encoded = Buffer.from(varint.encode(255));
const defavlueMajorVersion = "1.21";
const defaultProtocol = 767;
export function mcPing(options, cb?: (err: any, data: any) => void) {
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
function encodeString(str) {
  const strBuf = Buffer.from(str, "utf8");
  const lenBuf = Buffer.from(varint.encode(strBuf.length));
  return Buffer.concat([lenBuf, strBuf]);
}

function encodeVarInt(value) {
  return Buffer.from(varint.encode(value));
}
function createPacket(id, data) {
  const idBuf = encodeVarInt(id);
  const packetData = Buffer.concat([idBuf, data]);
  const lengthBuf = encodeVarInt(packetData.length);
  return Buffer.concat([lengthBuf, packetData]);
}

function ping(options) {
  const host = options.host || "localhost";
  const port = options.port || 25565;
  options.majorVersion = options.version || defavlueMajorVersion;
  const protocolVersion = options.protocol || defaultProtocol;

  const closeTimeout = options.closeTimeout || 20 * 1000; //超时时间

  return new Promise((resolve, reject) => {
    const client = net.createConnection({
      host: host,
      port: port,
    });
    let buffer = Buffer.alloc(0);
    let startTime = null; // 记录开始时间
    const onData = (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const length = varint.decode(buffer);
        const offset1 = varint.decode.bytes;
        const packetId = varint.decode(buffer.slice(offset1));
        const offset2 = offset1 + varint.decode.bytes;
        const stringLength = varint.decode(buffer.slice(offset2));
        const offset3 = offset2 + varint.decode.bytes;
        // 判断包是否完整
        // if (buffer.length < length + varint.decode.bytes) return;
        const jsonString = buffer
          .slice(offset3, offset3 + stringLength)
          .toString();
        const status = JSON.parse(jsonString);
        const latency = Date.now() - startTime; // 计算延迟
        client.end();
        resolve({
          ...status,
          latency: latency,
        });
      } catch (e) {
        // client.destroy();
        // reject(new Error(`数据解析失败: ${e}`));
      }
    };
    client.setTimeout(closeTimeout, () => {
      client.destroy();
      reject(new Error("连接超时"));
    });

    client.on("error", reject);
    client.on("data", onData);
    client.once("connect", () => {
      // 构建 handshake 数据
      const handshakeData = Buffer.concat([
        encodeVarInt(protocolVersion), // 协议版本
        encodeString(host), // 主机名
        Buffer.from([(port >> 8) & 0xff, port & 0xff]), // 端口（2 字节）
        Buffer.from([0x01]), // 下一状态：1 = status
      ]);

      // 发送 handshake 包（packetId = 0x00）
      const handshakePacket = createPacket(0x00, handshakeData);

      // 发送 status 请求包（packetId = 0x00，无数据）
      const requestPacket = createPacket(0x00, Buffer.alloc(0));

      startTime = Date.now();
      client.write(Buffer.concat([handshakePacket, requestPacket]));
    });
  });
}
