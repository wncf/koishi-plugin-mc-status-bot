# koishi-plugin-mc-status-bot

[![npm](https://img.shields.io/npm/v/koishi-plugin-mc-status-bot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-mc-status-bot)

📌 一个通过TCP协议获取Minecraft Java版服务器状态的Koishi插件，支持多群组隔离管理。

## 功能特性

✅ **核心功能**
- 实时获取服务器状态（版本、在线玩家、延迟等）
- 内置数据库存储群组专属服务器列表
- 自动移除描述中的颜色代码等非文本内容（可配置）
- 支持 Query 协议查询（可获取完整在线玩家列表）
- 几乎兼容所有标准Java版服务器

⚡ **性能优势**
- 延迟计算（显示ping值）
- 批量查询支持（一次查看所有服务器状态）
- 轻量级TCP请求（1.0.10+）

## 使用指南

### 主指令 `mc`
获取服务器状态（不接参数时显示所有服务器）
```tex
示例输出：
lmy[mc.123456:25565]
描述：EF Island
延迟: 31ms
版本：1.12.2
在线人数：4/30
当前在线：玩家1,玩家2,玩家3,玩家4
mod数：123
***********************
atm7-sky[mc.123456.top:25565]
版本：1.18.2
在线人数：0/20
```

### 子指令系统

#### 1. 管理服务器列表

| 指令      | 参数                         | 功能说明            |
| :-------- | :--------------------------- | :------------------ |
| `mc set`  | `<名称>` `<地址:端口>` `[enableQuery]` | 添加/修改服务器信息（enableQuery 为可选参数，启用后使用 Query 协议获取详细玩家列表） |
| `mc del`  | `<名称>`                  | 删除指定服务器      |
| `mc list` | 无                           | 查看当前服务器列表  |

```
mc list 示例：
服务器名称：lmy
服务器ip：mc.123456
服务器端口：25565
enableQuery查询：是
***********************
服务器名称：gtnh
服务器ip：node.123456
服务器端口：25565
enableQuery查询：否
```

#### 2. 临时查询

| 指令      | 参数             | 功能说明               |
| :-------- | :--------------- | :--------------------- |
| `mc ping` | `<地址:端口>` `[enableQuery]` | 临时查询指定服务器状态（enableQuery 为可选参数，启用后使用 Query 协议获取详细玩家列表） |

## 配置项

```
# koishi.yml 配置示例
mc-status-bot:
  adminUsers: []       # 管理员用户qq，根据koishi提供的`user.id`字段，不同适配器有所不同
  groupKeep: true      # 启用群组隔离，在哪个群聊中新增的服务端信息，只能在其群聊中查看（默认true）
  descriptionFormatting: true  # 自动清理描述中的非纯文本（默认true）
```

## Query 协议说明

启用 `enableQuery` 后，插件将使用 Minecraft Query 协议查询服务器状态。相比标准 ping 协议，Query 协议可以获取：
- 完整的在线玩家列表（不会出现匿名情况）
- 更详细的服务器信息

**注意事项：**
- 需要服务器开启 Query 协议（默认端口通常与游戏端口相同）
- 开启 Query协议 ：服务端配置文件 Server.properties 的enable-query的值修改为true，保存重启即可
- 某些服务器可能未启用 Query 协议，如果使用 Query协议 此时会报错
- Query 协议查询失败时会显示错误信息

## 兼容性说明

• 几乎支持所有标准Minecraft Java版服务端（Vanilla/Forge/Fabric等）
• 需要服务器开启TCP ping响应（默认25565端口）
• Query 协议需要服务器额外开启 Query 功能（部分服务端默认关闭）
