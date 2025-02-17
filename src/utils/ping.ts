"use strict";

import Client from "minecraft-protocol/src/client";
import states from "minecraft-protocol/src/states";
import tcpDns from "minecraft-protocol/src/client/tcp_dns";
import mcVersion from "minecraft-protocol/src/version";
import minecraftData from "minecraft-data";

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

function ping(options) {
  options.host = options.host || "localhost";
  options.port = options.port || 25565;
  const optVersion = options.version || mcVersion.defaultVersion;
  const mcData = minecraftData(optVersion);
  const version = mcData.version;
  options.majorVersion = version.majorVersion;
  options.protocolVersion = version.version;
  let closeTimer = null;
  options.closeTimeout = options.closeTimeout || 120 * 1000;
  options.noPongTimeout = options.noPongTimeout || 5 * 1000;

  const client = new Client(false, version.minecraftVersion, null, true);
  return new Promise((resolve, reject) => {
    client.on("error", function (err) {
      clearTimeout(closeTimer);
      client.end();
      reject(err);
    });
    client.once("server_info", function (packet) {
      const data = JSON.parse(packet.response);
      const start = Date.now();
      const maxTime = setTimeout(() => {
        clearTimeout(closeTimer);
        client.end();
        resolve(data);
      }, options.noPongTimeout);
      client.once("ping", function (packet) {
        data.latency = Date.now() - start;
        clearTimeout(maxTime);
        clearTimeout(closeTimer);
        client.end();
        resolve(data);
      });
      client.write("ping", { time: [0, 0] });
    });
    client.on("state", function (newState) {
      if (newState === states.STATUS) {
        client.write("ping_start", {});
      }
    });
    // TODO: refactor with src/client/setProtocol.js
    client.on("connect", function () {
      client.write("set_protocol", {
        protocolVersion: options.protocolVersion,
        serverHost: options.host,
        serverPort: options.port,
        nextState: 1,
      });
      client.state = states.STATUS;
    });
    // timeout against servers that never reply while keeping
    // the connection open and alive.
    closeTimer = setTimeout(function () {
      client.end();
      reject(new Error("ETIMEDOUT"));
    }, options.closeTimeout);
    tcpDns(client, options);
    options.connect(client);
  });
}
