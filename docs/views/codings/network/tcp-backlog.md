---
title: Tcp backlog参数
date: '2022-7-11'
---
:::tip
面试问到了这个参数，之前没有留意到，现在总结下。
:::

## 半连接，全连接队列
当服务端调用listen函数时，TCP的状态被从CLOSE状态变为LISTEN，同时内核创建了两个队列：
- 半连接队列（Incomplete connection queue）,又称为SYN队列。服务端收到客户端的SYN包，回复SYN+ACK
但是还没有收到客户端ACK情况下，会将连接信息放入半连接队列。
- 全连接队列（Completed connection queue）,又称为Accept队列。服务端完成了三次握手，但是还未被accept
取走的连接队列。

## tcp_synack_retries tcp_abort_on_overflow
```shell script
# 服务端回复SYN+ACK包之后等待客户端回复ACK，同时开启一个定时器，如果超时还未收到ACK会进行SYN+ACK的重传
# 重传其次由tcp_synack_retries值确定
sysctl -a | grep tcp_synack_retries
net.ipv4.tcp_synack_retries = 5
# 默认情况下，全连接队列满以后，服务端会忽略客户端的ACK，随后重传SYN+ACK，也可以修改这个行为，通过
# tcp_abort_on_overflow决定
# 0：三次握手最后一步全连接队列满以后，server会丢掉client发过来的ACK，服务端随后会进行重传SYN+ACK
# 1：全连接队列满以后，服务端直接发送RST给客户端
sysctl -a | grep tcp_abort_on_overflow 
net.ipv4.tcp_abort_on_overflow = 0
```

## 半连接，全连接队列大小
- 半连接队列的大小与用户listen传入的backlog、net.core.somaxconn、net.ipv4.tcp_max_syn_backlog都有关系
- 全连接队列的大小是用户listen传入的backlog与net.core.somaxconn的较小值
```shell script
sysctl -a | grep net.core.somaxconn
net.core.somaxconn = 128
sysctl -a | grep net.ipv4.tcp_max_syn_backlog
net.ipv4.tcp_max_syn_backlog = 4096
```

## 合适的backlog
- 接口处理连接速度快，或者做压力测试，调高这个值
- 业务接口性能不好，accept取走连接的速度较慢，调小这个值，调大只会增加连接失败的可能性  
典型应用backlog值，Nginx=511, Redix=511, Linux=128, Java=50

## ss
```shell script
ss -ltnp | grep 5212
LISTEN    0(recv-Q)         128(Send-Q)                      *:5212                   *:*        users:(("cloudreve",pid=255440,fd=6))  
```
- 处在LISTEN状态的socket,Recv-Q表示当前socket完成三次握手等待用户进程accept的连接个数，Send-Q表示当前Socket
全连接队列能容纳的连接数
- 非LISTEN状态的socket,Recv-Q表示receive queue的字节大小,Send-Q表示send queue的字节大小

## 原文
[再聊 TCP backlog](https://juejin.cn/post/6844904071367753736)