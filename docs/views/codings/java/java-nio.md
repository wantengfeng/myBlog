---
title: Java Nio
date: '2021-5-15'
sidebar: 'auto'
categories:
- java
tags:
- nio
---
:::tip
Java Nio是另一种可选择的IO API，区别于标准的Java IO和Java Networking API。Java Nio提供了一种不同的编程模型，
被称为非阻塞IO，实际上这是不准确的，它提供的一些API实际上也是阻塞的，例如：文件API。
:::
#### 背景
Java 非阻塞IO: Java Nio允许使用非阻塞IO，例如：一个线程可以在Channel中读数据到一个Buffer中。当正在读取数据的时候，线程也可以去做其他事情。
一旦数据读取到了Buffer中，那么线程可以继续处理数据。将数据从Buffer中写入Channel中也是一样。
#### 概念
Java Nio主要包括以下三个核心组件：
* Channels
* Buffers
* Selectors
Java Nio有很多的类和组件，但是这三个是核心。
#### Channels 和 Buffers
所有的IO都开始于一个Channel。一个Channel就是一个Stream，我们可以从Channel中读数据到Buffer中，也可以把Buffer中的数据
写到Channel中。
Channel的种类有以下几种：
* FileChannel
* DatagramChannel
* SocketChannel
* ServerSocketChannel  

这些Channels涵盖了UDP+TCP网络IO和文件IO。  

Buffer的种类也有以下几种：
* ByteBuffer
* CharBuffer
* DoubleBuffer
* FloatBuffer
* IntBuffer
* LongBuffer
* ShortBuffer
这些Buffer涵盖了基本的数据类型，另外还有MapperByteBuffer用于操作内存映射文件。
#### Selectors
单个线程可以可以使用Selectors操作多个Channel。这对于有多个连接打开，但是每个连接只有少量流量的应用来说很方便。  
你需要注册Channel到Selector中，然后调用select()方法，这个方法会阻塞直到有一个channel准备好。一旦方法返回，线程就可以处理相关的事件
#### Scatter/Gather
Java Nio内置Scatter/Gather支持，Scatter/Gather被用来从channels中读写数据使用。  
scatter可以将数据从channel读取到多个buffer中；gather可以将多个buffer中的数据写到一个channel中。它们有时候会非常有用，比如：如果一条消息包含
header和body，那么我们可以将它们两个读取到不同的buffer中，然后分别处理它们。
#### Pipe
Java Nio Pipe是一种两个线程数据连接的一种方式。一个pipe包含两种channel，一个sink channel，一个source channel。一个线程可以将数据写入sink channel，
另一个线程可以从source channel中读取数据。

#### 最后
这篇文章知识简单地罗列了Java Nio的基本概念和class，认识到这种新的开发IO开发模型，详细内容可以查看本文的参考资料。

#### 参考资料
[Java Nio Tutorial](http://tutorials.jenkov.com/java-nio/index.html)