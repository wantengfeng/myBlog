---
title: Reactor模式
date: '2022-7-5'
---
:::tip
Reactor是常用的网络编程模式，使用多路复用IO，事件触发机制，今天在网上看到了一个Reactor模式的Demo，总结一下
:::

## reactor
```java
@Slf4j
public class NioReactor {
  // selector 监听socket就绪事件
  private final Selector selector;
  // 分发器，将就绪的事件分配给对象的handler执行，内部有自己的线程池
  private final Dispatcher dispatcher;
  /**
   * All the work of altering the SelectionKey operations and Selector operations are performed in
   * the context of main event loop of reactor. So when any channel needs to change its readability
   * or writability, a new command is added in the command queue and then the event loop picks up
   * the command and executes it in next iteration.
   */
  // readability <---> writability 状态转变
  private final Queue<Runnable> pendingCommands = new ConcurrentLinkedQueue<>();
  // reactor线程
  private final ExecutorService reactorMain = Executors.newSingleThreadExecutor();

  /**
   * Creates a reactor which will use provided {@code dispatcher} to dispatch events. The
   * application can provide various implementations of dispatcher which suits its needs.
   *
   * @param dispatcher a non-null dispatcher used to dispatch events on registered channels.
   * @throws IOException if any I/O error occurs.
   */
  public NioReactor(Dispatcher dispatcher) throws IOException {
    this.dispatcher = dispatcher;
    this.selector = Selector.open();
  }

  /**
   * Starts the reactor event loop in a new thread.
   */
  public void start() {
    reactorMain.execute(() -> {
      try {
        LOGGER.info("Reactor started, waiting for events...");
        // 事件循环
        eventLoop();
      } catch (IOException e) {
        LOGGER.error("exception in event loop", e);
      }
    });
  }

  /**
   * Stops the reactor and related resources such as dispatcher.
   *
   * @throws InterruptedException if interrupted while stopping the reactor.
   * @throws IOException          if any I/O error occurs.
   */
  public void stop() throws InterruptedException, IOException {
    reactorMain.shutdown();
    selector.wakeup();
    if (!reactorMain.awaitTermination(4, TimeUnit.SECONDS)) {
      reactorMain.shutdownNow();
    }
    selector.close();
    LOGGER.info("Reactor stopped");
  }

  /**
   * Registers a new channel (handle) with this reactor. Reactor will start waiting for events on
   * this channel and notify of any events. While registering the channel the reactor uses {@link
   * AbstractNioChannel#getInterestedOps()} to know about the interested operation of this channel.
   *
   * @param channel a new channel on which reactor will wait for events. The channel must be bound
   *                prior to being registered.
   * @return this
   * @throws IOException if any I/O error occurs.
   */
  // 在reactor中注册channel
  public NioReactor registerChannel(AbstractNioChannel channel) throws IOException {
    // 在selector中注册channel
    var key = channel.getJavaChannel().register(selector, channel.getInterestedOps());
    // key attach该channel
    key.attach(channel);
    channel.setReactor(this);
    return this;
  }

  private void eventLoop() throws IOException {
    // honor interrupt request
    while (!Thread.interrupted()) {
      // honor any pending commands first
      processPendingCommands();

      /*
       * Synchronous event de-multiplexing happens here, this is blocking call which returns when it
       * is possible to initiate non-blocking operation on any of the registered channels.
       */
      selector.select();

      /*
       * Represents the events that have occurred on registered handles.
       */
      var keys = selector.selectedKeys();
      var iterator = keys.iterator();

      while (iterator.hasNext()) {
        var key = iterator.next();
        if (!key.isValid()) {
          iterator.remove();
          continue;
        }
        // 处理就绪的key
        processKey(key);
      }
      keys.clear();
    }
  }

  private void processPendingCommands() {
    var iterator = pendingCommands.iterator();
    while (iterator.hasNext()) {
      var command = iterator.next();
      command.run();
      iterator.remove();
    }
  }

  /*
   * Initiation dispatcher logic, it checks the type of event and notifier application specific
   * event handler to handle the event.
   */
  private void processKey(SelectionKey key) throws IOException {
    if (key.isAcceptable()) {
      onChannelAcceptable(key);
    } else if (key.isReadable()) {
      onChannelReadable(key);
    } else if (key.isWritable()) {
      onChannelWritable(key);
    }
  }

  private static void onChannelWritable(SelectionKey key) throws IOException {
    var channel = (AbstractNioChannel) key.attachment();
    channel.flush(key);
  }
  
  private void onChannelReadable(SelectionKey key) {
    try {
      // reads the incoming data in context of reactor main loop. Can this be improved?
      var readObject = ((AbstractNioChannel) key.attachment()).read(key);
      // 将数据分发给对应的handler，内有工作线程，异步执行
      dispatchReadEvent(key, readObject);
    } catch (IOException e) {
      try {
        key.channel().close();
      } catch (IOException e1) {
        LOGGER.error("error closing channel", e1);
      }
    }
  }

  /*
   * Uses the application provided dispatcher to dispatch events to application handler.
   */
  private void dispatchReadEvent(SelectionKey key, Object readObject) {
    dispatcher.onChannelReadEvent((AbstractNioChannel) key.attachment(), readObject, key);
  }
  // 处理就绪事件
  private void onChannelAcceptable(SelectionKey key) throws IOException {
    var serverSocketChannel = (ServerSocketChannel) key.channel();
    // accept完成
    var socketChannel = serverSocketChannel.accept();
    socketChannel.configureBlocking(false);
、  // 将该channel注册到selector中，关注可读事件
    var readKey = socketChannel.register(selector, SelectionKey.OP_READ);
    readKey.attach(key.attachment());
  }

  /**
   * Queues the change of operations request of a channel, which will change the interested
   * operations of the channel sometime in future.
   *
   * <p>This is a non-blocking method and does not guarantee that the operations have changed when
   * this method returns.
   *
   * @param key           the key for which operations have to be changed.
   * @param interestedOps the new interest operations.
   */
  public void changeOps(SelectionKey key, int interestedOps) {
    pendingCommands.add(new ChangeKeyOpsCommand(key, interestedOps));
    selector.wakeup();
  }

  /**
   * A command that changes the interested operations of the key provided.
   */
  class ChangeKeyOpsCommand implements Runnable {
    private final SelectionKey key;
    private final int interestedOps;

    public ChangeKeyOpsCommand(SelectionKey key, int interestedOps) {
      this.key = key;
      this.interestedOps = interestedOps;
    }

    public void run() {
      key.interestOps(interestedOps);
    }

    @Override
    public String toString() {
      return "Change of ops to: " + interestedOps;
    }
  }
}
```

## dispatcher
```java
/**
 * An implementation that uses a pool of worker threads to dispatch the events. This provides better
 * scalability as the application specific processing is not performed in the context of I/O
 * (reactor) thread.
 */
public class ThreadPoolDispatcher implements Dispatcher {
  // 分发器线程池
  private final ExecutorService executorService;

  /**
   * Creates a pooled dispatcher with tunable pool size.
   *
   * @param poolSize number of pooled threads
   */
  public ThreadPoolDispatcher(int poolSize) {
    this.executorService = Executors.newFixedThreadPool(poolSize);
  }

  /**
   * Submits the work of dispatching the read event to worker pool, where it gets picked up by
   * worker threads. <br> Note that this is a non-blocking call and returns immediately. It is not
   * guaranteed that the event has been handled by associated handler.
   */
  @Override
  public void onChannelReadEvent(AbstractNioChannel channel, Object readObject, SelectionKey key) {
    executorService.execute(() -> channel.getHandler().handleChannelRead(channel, readObject, key));
  }

  /**
   * Stops the pool of workers.
   *
   * @throws InterruptedException if interrupted while stopping pool of workers.
   */
  @Override
  public void stop() throws InterruptedException {
    executorService.shutdown();
    if (executorService.awaitTermination(4, TimeUnit.SECONDS)) {
      executorService.shutdownNow();
    }
  }
}
```
## handler处理器
```java
/**
 * Logging server application logic. It logs the incoming requests on standard console and returns a
 * canned acknowledgement back to the remote peer.
 */
@Slf4j
public class LoggingHandler implements ChannelHandler {

  private static final byte[] ACK = "Data logged successfully".getBytes();

  /**
   * 处理读事件
   * Decodes the received data and logs it on standard console.
   */
  @Override
  public void handleChannelRead(AbstractNioChannel channel, Object readObject, SelectionKey key) {
    /*
     * As this handler is attached with both TCP and UDP channels we need to check whether the data
     * received is a ByteBuffer (from TCP channel) or a DatagramPacket (from UDP channel).
     */
    if (readObject instanceof ByteBuffer) {
      doLogging((ByteBuffer) readObject);
      sendReply(channel, key);
    } else if (readObject instanceof DatagramPacket) {
      var datagram = (DatagramPacket) readObject;
      doLogging(datagram.getData());
      sendReply(channel, datagram, key);
    } else {
      throw new IllegalStateException("Unknown data received");
    }
  }

  private static void sendReply(
      AbstractNioChannel channel,
      DatagramPacket incomingPacket,
      SelectionKey key
  ) {
    /*
     * Create a reply acknowledgement datagram packet setting the receiver to the sender of incoming
     * message.
     */
    var replyPacket = new DatagramPacket(ByteBuffer.wrap(ACK));
    replyPacket.setReceiver(incomingPacket.getSender());

    channel.write(replyPacket, key);
  }

  private static void sendReply(AbstractNioChannel channel, SelectionKey key) {
    var buffer = ByteBuffer.wrap(ACK);
    channel.write(buffer, key);
  }

  private static void doLogging(ByteBuffer data) {
    // assuming UTF-8 :(
    LOGGER.info(new String(data.array(), 0, data.limit()));
  }
}
```
## channel
```java
/**
 * A wrapper over {@link NioServerSocketChannel} which can read and write data on a {@link
 * SocketChannel}.
 */
@Slf4j
public class NioServerSocketChannel extends AbstractNioChannel {

  private final int port;

  /**
   * Creates a {@link ServerSocketChannel} which will bind at provided port and use
   * <code>handler</code> to handle incoming events on this channel.
   *
   * <p>Note the constructor does not bind the socket, {@link #bind()} method should be called for
   * binding the socket.
   *
   * @param port    the port on which channel will be bound to accept incoming connection requests.
   * @param handler the handler that will handle incoming requests on this channel.
   * @throws IOException if any I/O error occurs.
   */
  public NioServerSocketChannel(int port, ChannelHandler handler) throws IOException {
    super(handler, ServerSocketChannel.open());
    this.port = port;
  }


  @Override
  public int getInterestedOps() {
    // being a server socket channel it is interested in accepting connection from remote peers.
    return SelectionKey.OP_ACCEPT;
  }

  /**
   * Get server socket channel.
   *
   * @return the underlying {@link ServerSocketChannel}.
   */
  @Override
  public ServerSocketChannel getJavaChannel() {
    return (ServerSocketChannel) super.getJavaChannel();
  }

  /**
   * Reads and returns {@link ByteBuffer} from the underlying {@link SocketChannel} represented by
   * the <code>key</code>. Due to the fact that there is a dedicated channel for each client
   * connection we don't need to store the sender.
   */
  @Override
  public ByteBuffer read(SelectionKey key) throws IOException {
    var socketChannel = (SocketChannel) key.channel();
    var buffer = ByteBuffer.allocate(1024);
    var read = socketChannel.read(buffer);
    buffer.flip();
    if (read == -1) {
      throw new IOException("Socket closed");
    }
    return buffer;
  }

  /**
   * Binds TCP socket on the provided <code>port</code>.
   *
   * @throws IOException if any I/O error occurs.
   */
  @Override
  public void bind() throws IOException {
    var javaChannel = getJavaChannel();
    javaChannel.socket().bind(new InetSocketAddress(InetAddress.getLocalHost(), port));
    javaChannel.configureBlocking(false);
    LOGGER.info("Bound TCP socket at port: {}", port);
  }

  /**
   * Writes the pending {@link ByteBuffer} to the underlying channel sending data to the intended
   * receiver of the packet.
   */
  @Override
  protected void doWrite(Object pendingWrite, SelectionKey key) throws IOException {
    var pendingBuffer = (ByteBuffer) pendingWrite;
    ((SocketChannel) key.channel()).write(pendingBuffer);
  }
}
```

## 参考资料
[java-design-patterns](https://java-design-patterns.com/)
