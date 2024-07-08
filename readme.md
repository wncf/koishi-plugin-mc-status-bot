# koishi-plugin-mc-status-bot

[![npm](https://img.shields.io/npm/v/koishi-plugin-mc-status-bot?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-mc-status-bot)

#### 轻松获取我的世界服务器状态信息

- **主命令：mc**

  - name 可选 --服务器名称 (为空获取所有服务器的状态)

  **返回示例**

  ```tex
  lmy[mc.123456:25565]
  描述：EF Island
  版本：1.12.2
  在线人数：4/30
  当前在线：玩家1,玩家2,玩家3,玩家4
  mod数：123
  ***********************
  atm7-sky[mc.123456.top:25565]
  版本：1.18.2
  在线人数：0/20
  ***********************
  渲染服务器左侧的图片
  gtnh[node.123456:25565]
  版本：1.7.10
  在线人数：0/20
  ```


**可用的子指令有：**

- mc set 新增/修改一个服务器信息，修改时通过名称匹配

  可用的选项有：

  - name 名称

  - address 格式为地址:端口； (服务器的ip和端口，端口不填为25565)

- mc del 删除一个服务器

  可用的选项有：

  - name 名称

- mc list 获取添加过服务器列表

  **返回示例**

  ```tex
  服务器名称： lmy
  服务器ip： mc.123456
  服务器端口： 25565
  ***********************
  服务器名称： gtnh
  服务器ip： node.123456
  服务器端口： 25565
  ```

- mc ping 临时获取一个地址的服务器状态

  可用的选项有：

  - address 格式为地址:端口； (服务器的ip和端口，端口不填为25565)

- 

**插件配置**

adminUsers: 有权限进行操作的用户id

groupKeep: 是否开启群组隔离，开启后在哪里添加的服务器只能在哪里看到

