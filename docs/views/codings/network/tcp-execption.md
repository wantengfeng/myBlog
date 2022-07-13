---
title: tcp异常场景
date: '2022-7-11'
---
:::tip
平时解除的Tcp都是正常场景，那么对于异常场景例如断电，断网等，tcp是什么状态呢？
:::

## tcp断开发起人
a、b两个正常连接的对端进程。假如b进程没有调用close就异常终止，那么发送FIN包是内核os代劳
```shell script
# 开启20880端口
python -m SimpleHTTPServer 20880
# 连接该端口
nc -v localhost 20880
Connection to localhost port 20880 [tcp/*] succeeded!
# 查看连接
lsof -i:20880
COMMAND   PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
Python  38361 jameswan    3u  IPv4 0x709d2e85b3975315      0t0  TCP *:20880 (LISTEN)
Python  38361 jameswan    8u  IPv4 0x709d2e85b3957f55      0t0  TCP localhost:20880->localhost:50272 (ESTABLISHED)
nc      38372 jameswan    3u  IPv4 0x709d2e85a8403935      0t0  TCP localhost:50272->localhost:20880 (ESTABLISHED)
# 杀死客户端进程
kill -9 nc-pid
# 连接断开，os帮忙发送FIN包
lsof -i:20880
COMMAND   PID     USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
Python  38361 jameswan    3u  IPv4 0x709d2e85b3975315      0t0  TCP *:20880 (LISTEN)
```

## 断网
### 有数据传输
如果断网时有数据发送，由于收不到ACK，所以会重试，达到一定次数之后，如果仍然没有确认应答返回，就判断为网络或者对端
主机发送了异常，强制关闭连接。此时的关闭是直接关闭，没有挥手过程（因为数据发送不过去）
linux下的设置
>最小重传时间是200ms
>最大重传时间是120s
>重传次数为15

### 没有数据传输
没有数据传输，还要看TCP连接的KeepAlive是否开启。KeepAlive简介：
- TCP KeepAlive 是一种在不影响数据流内容的情况下探测对方的方式，采用保活计时器实现，当计时器被触发时，一端发送保活报文，另一端接收到报文后发送 ACK 响应
- 它并不是 TCP 的规范，但大部分的实现都提供了这一机制
- 该机制存在争议，有的人保活机制应该在应用程序中实现
#### 开启KeepAlive
- Keepalive_time：空闲时间，即多长时间连接没有发送数据时开始 KeepAlive 检测
- Keepalive_intvl：发送间隔时间
- Keepalive_probs：最多发送多少个检测数据包
```shell script
sysctl -a |grep keepalive
net.ipv4.tcp_keepalive_intvl = 75
net.ipv4.tcp_keepalive_probes = 9
net.ipv4.tcp_keepalive_time = 7200
```
测试：client开启KeepAlive连接server后，什么数据都不发送，把server的网断掉，可以看到keepalive心跳包，一段时间后连接被置为CLOSE状态

#### 关闭keepalive
如果没有数据传输，连接永远不会断开

#### 断电断网后server恢复
如果 client 与 server 建立连接后，没有数据传输，断掉 server 端的网络，这时如果把 server 程序重启一下，再恢复网络，那这条连接还能用吗？  
如果 server 重启后，client 还是不发数据，那这条连接看起来还是可用的，因为他们根本不知道对方是个什么情况，但如果此时 client 发送一点数据给 server，你会发现 server 会发送一个 RST 给client，然后 client 就断开连接了

## 原文
[4个实验，彻底搞懂TCP连接的断开](https://cloud.tencent.com/developer/article/1893375)