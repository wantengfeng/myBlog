---
title: Netty
date: '2021-5-15'
sidebar: 'true'
categories:
- java
tags:
- netty
---
:::tip
Netty是Java高性能IO的工具，可以帮助我们构建可扩展，健壮的网络程序，Netty包含一些操作系统特定优化，例如使用了Linux中的epoll。
:::
## Netty tools
Netty包含很多IO工具集，例如：
* Http Server
* Https Server
* WebSocket Server
* Tcp Server
* Udp Server
* in VM Pipe

使用Netty可以很容易开发一个Http Server，WebSocket Server等等，这只需要几行代码而已。

## Netty 安装
安装Netty只需要引入相关的jar包到项目的classpath路径即可，我们可以使用maven，例如：
```xml
<dependency>
    <groupId>io.netty</groupId>
    <artifactId>netty-all</artifactId>
    <version>xxxx</version>
</dependency>
```

## Netty 概念
Netty有一些专有的概念需要理解，包括
* Bootstrap
* EventLoopGroup
* EventLoop
* SocketChannel
* ChannelInitializer
* ChannelPipeline
* ChannelHandler

### Bootstrap
Bootstrap类负责启动Netty。启动过程包括，例如：启动线程，打开socket等等。

### EventLoopGroup
EventLoopGroup是一组EventLoop，多个EventLoop被组织到一起。通过这种方式，EventLoop分享相同的资源，例如线程等等。

### EventLoop
一个EventLoop循环地检查新的事件，例如从network socket(SocketChannel实例)传输过来的数据。当事件发生的时候，该事件会被传输给正确的事件处理器，
例如一个ChannelHandler。

### SocketChannel
一个SocketChannel代表一个TCP连接，当你使用Netty作为客户端或者服务端的时候，所有的数据通过SocketChannel传输。一个SocketChannel被唯一一个相同
的EventLoop管理，因为EventLoop总是被相同的线程执行，所以一个SocketChannel只能被相同的线程访问，因为当从SocketChannel中读取数据的时候，我们不用
担心数据同步的问题。

### ChannelInitializer
一个ChannelInitializer是一个特殊的ChannelHandler，当SocketChannel被创建的时候，ChannelHandler被绑定在SocketChannel的ChannelPipeline
中。初始化SocketChannel的时候会调用ChannelInitializer，初始化完成之后，ChannelInitializer会被移出ChannelPipeline。

### ChannelPipeline
每个SocketChannel都有一个对应的ChannelPipeline，ChannelPipeline包含一系列的ChannelHandler。当EventLoop从SocketChannel读取数据时，
数据会被传输到ChannelPipeline中的第一个ChannelHandler，第一个ChannelHandler处理完数据之后会被传输到下一个ChannelHandler去处理，直到
传输到最后一个ChannelHandler。当向SocketChannel中写入数据时，数据会被先被传输到ChannelPipeline中进行处理。  
ChannelPipeline在Netty中处于非常核心的地位，当数据写入写出SocketChannel时，ChannelPipeline中的ChannelHandler实例就会被调用。ChannelHandler
接口有两个子接口，它们是：
* ChannelInboundHandler
* ChannelOutBoundHandler

你可以把这两种类型的实例都加入到ChannelPipeline中。

#### Codecs
Netty有codecs的概念（encoders+decoders）。codec负责将二进制数据转化为消息对象（Java 对象），或者将消息对象转化为二进制数据。例如，对于Http
请求来说，codec负责将Http请求的原生二进制数据转化为Http对象，或者将Http响应对象转化为原生二进制数据。  
codec对象实际上就是一个或两个ChannelHandler实现，它包含一个ChannelInboundHandler实现，负责将请求二进制数据转化为对象，一个ChannelOutboundHandler
实现，负责将响应对象转化为二进制。  
Netty可以包含不同协议的codec，例如Http，WebSocket，SSL/TLS等等。为了使用这些协议，你需要将相应的协议codec（ChannelInboundHandler+ChannelOutboundHandler）
加入对应协议的SocketChannel中的ChannelPipeline。

### ChannelHandler
一个ChannelHandler可以处理来自SocketChannel的数据，也可以处理即将写入SocketChannel的数据。

## Netty TCP Server
Netty服务器的一个用途就是TCP服务器，为了创建Netty TCP服务器，步骤如下：
* 创建一个EventLoopGroup
* 创建并配置一个ServerBootStrap
* 创建一个ChannelInitializer
* 服务器启动

实例代码如下：
```java
EventLoopGroup group = new NioEventLoopGroup();

try{
    ServerBootstrap serverBootstrap = new ServerBootstrap();
    serverBootstrap.group(group);
    serverBootstrap.channel(NioServerSocketChannel.class);
    serverBootstrap.localAddress(new InetSocketAddress("localhost", 9999));

    serverBootstrap.childHandler(new ChannelInitializer<SocketChannel>() {
        protected void initChannel(SocketChannel socketChannel) throws Exception {
            socketChannel.pipeline().addLast(new HelloServerHandler());
        }
    });
    ChannelFuture channelFuture = serverBootstrap.bind().sync();
    channelFuture.channel().closeFuture().sync();
} catch(Exception e){
    e.printStackTrace();
} finally {
    group.shutdownGracefully().sync();
}
```
## Netty TCP Client
Netty也可以用来创建TCP clients。步骤如下：
* 创建一个EventLoopGroup
* 创建并配置Bootstrap（和server不一样）
* 创建一个ChannelInitializer
* 启动客户端

实例代码如下：
```java
EventLoopGroup group = new NioEventLoopGroup();
try{
    Bootstrap clientBootstrap = new Bootstrap();

    clientBootstrap.group(group);
    clientBootstrap.channel(NioSocketChannel.class);
    clientBootstrap.remoteAddress(new InetSocketAddress("localhost", 9999));
    clientBootstrap.handler(new ChannelInitializer<SocketChannel>() {
        protected void initChannel(SocketChannel socketChannel) throws Exception {
            socketChannel.pipeline().addLast(new ClientHandler());
        }
    });
    ChannelFuture channelFuture = clientBootstrap.connect().sync();
    channelFuture.channel().closeFuture().sync();
} finally {
    group.shutdownGracefully().sync();
}
```

## 参考教程
[Netty Tutorial](http://tutorials.jenkov.com/netty/index.html)

