---
title: '设计模式（2）'
date: '2022-7-4'
---
## 异步方法调用（async-method-invocation）
```java
/**
 * Implementation of async executor that creates a new thread for every task.
 */
public class ThreadAsyncExecutor implements AsyncExecutor {

  /**
   * Index for thread naming.
   */
  private final AtomicInteger idx = new AtomicInteger(0);

  @Override
  public <T> AsyncResult<T> startProcess(Callable<T> task) {
    return startProcess(task, null);
  }

  @Override
  public <T> AsyncResult<T> startProcess(Callable<T> task, AsyncCallback<T> callback) {
    var result = new CompletableResult<>(callback);
    new Thread(() -> {
      try {
        result.setValue(task.call());
      } catch (Exception ex) {
        result.setException(ex);
      }
    }, "executor-" + idx.incrementAndGet()).start();
    // 直接返回，不用等待任务执行完毕
    return result;
  }

  @Override
  public <T> T endProcess(AsyncResult<T> asyncResult) throws ExecutionException,
      InterruptedException {
    if (!asyncResult.isCompleted()) {
      // 任务没完成，当前线程等待。
      asyncResult.await();
    }
    // 返回结果
    return asyncResult.getValue();
  }

  /**
   * Simple implementation of async result that allows completing it successfully with a value or
   * exceptionally with an exception. A really simplified version from its real life cousins
   * FutureTask and CompletableFuture.
   *
   * @see java.util.concurrent.FutureTask
   * @see java.util.concurrent.CompletableFuture
   */
  private static class CompletableResult<T> implements AsyncResult<T> {
    // future状态
    static final int RUNNING = 1;
    static final int FAILED = 2;
    static final int COMPLETED = 3;
    // 锁
    final Object lock;
    // 回调
    final Optional<AsyncCallback<T>> callback;

    volatile int state = RUNNING;
    T value;
    Exception exception;

    CompletableResult(AsyncCallback<T> callback) {
      this.lock = new Object();
      this.callback = Optional.ofNullable(callback);
    }

    /**
     * Sets the value from successful execution and executes callback if available. Notifies any
     * thread waiting for completion.
     *
     * @param value value of the evaluated task
     */
    void setValue(T value) {
      this.value = value;
      this.state = COMPLETED;
      // 执行回调
      this.callback.ifPresent(ac -> ac.onComplete(value, Optional.empty()));
      // 获得锁，然后唤醒await等待线程
      synchronized (lock) {
        lock.notifyAll();
      }
    }

    /**
     * Sets the exception from failed execution and executes callback if available. Notifies any
     * thread waiting for completion.
     *
     * @param exception exception of the failed task
     */
    void setException(Exception exception) {
      this.exception = exception;
      this.state = FAILED;
      this.callback.ifPresent(ac -> ac.onComplete(null, Optional.of(exception)));
      synchronized (lock) {
        lock.notifyAll();
      }
    }

    @Override
    public boolean isCompleted() {
      return state > RUNNING;
    }

    @Override
    public T getValue() throws ExecutionException {
      if (state == COMPLETED) {
        return value;
      } else if (state == FAILED) {
        throw new ExecutionException(exception);
      } else {
        throw new IllegalStateException("Execution not completed yet");
      }
    }

    @Override
    public void await() throws InterruptedException {
      // 首先获得锁，如果没有完成，该线程等待，等待被唤醒
      synchronized (lock) {
        while (!isCompleted()) {
          lock.wait();
        }
      }
    }
  }
}
```
## 迭代器模式（Iterator）
```java
/**
 * An in-order implementation of a BST Iterator. For example, given a BST with Integer values,
 * expect to retrieve TreeNodes according to the Integer's natural ordering (1, 2, 3...)
 *
 * @param <T> This Iterator has been implemented with generic typing to allow for TreeNodes of
 *            different value types
 */
public class BstIterator<T extends Comparable<T>> implements Iterator<TreeNode<T>> {

  private final ArrayDeque<TreeNode<T>> pathStack;
  // 二叉搜索树的遍历，实现Interator接口，和具体的数据结构解耦，可以很轻松完成数据的遍历。
  public BstIterator(TreeNode<T> root) {
    pathStack = new ArrayDeque<>();
    pushPathToNextSmallest(root);
  }

  /**
   * This BstIterator manages to use O(h) extra space, where h is the height of the tree It achieves
   * this by maintaining a stack of the nodes to handle (pushing all left nodes first), before
   * handling self or right node.
   *
   * @param node TreeNode that acts as root of the subtree we're interested in.
   */
  private void pushPathToNextSmallest(TreeNode<T> node) {
    while (node != null) {
      pathStack.push(node);
      node = node.getLeft();
    }
  }

  /**
   * Checks if there exists next element.
   *
   * @return true if this iterator has a "next" element
   */
  @Override
  public boolean hasNext() {
    return !pathStack.isEmpty();
  }

  /**
   * Gets the next element.
   *
   * @return TreeNode next. The next element according to our in-order traversal of the given BST
   * @throws NoSuchElementException if this iterator does not have a next element
   */
  @Override
  public TreeNode<T> next() throws NoSuchElementException {
    if (pathStack.isEmpty()) {
      throw new NoSuchElementException();
    }
    var next = pathStack.pop();
    pushPathToNextSmallest(next.getRight());
    return next;
  }

}
```
## 解释器模式(Interpreter)
```java

/**
 * 加减乘除解释器
 * Expression.
 */
public abstract class Expression {
  // 解释接口
  public abstract int interpret();

  @Override
  public abstract String toString();
}

/**
 * MinusExpression.
 */
public class MinusExpression extends Expression {

  private final Expression leftExpression;
  private final Expression rightExpression;

  public MinusExpression(Expression leftExpression, Expression rightExpression) {
    this.leftExpression = leftExpression;
    this.rightExpression = rightExpression;
  }

  @Override
  public int interpret() {
    return leftExpression.interpret() - rightExpression.interpret();
  }

  @Override
  public String toString() {
    return "-";
  }

}
/**
 * NumberExpression.
 */
public class NumberExpression extends Expression {

  private final int number;

  public NumberExpression(int number) {
    this.number = number;
  }

  public NumberExpression(String s) {
    this.number = Integer.parseInt(s);
  }

  @Override
  public int interpret() {
    return number;
  }

  @Override
  public String toString() {
    return "number";
  }
}
```
## 懒加载（lazy-loading）
```java
/**
 * Simple implementation of the lazy loading idiom. However, this is not thread safe.
 */
@Slf4j
public class HolderNaive {

  private Heavy heavy;

  /**
   * Constructor.
   */
  public HolderNaive() {
    LOGGER.info("HolderNaive created");
  }

  /**
   * Get heavy object.
   */
  public Heavy getHeavy() {
    if (heavy == null) {
      heavy = new Heavy();
    }
    return heavy;
  }
}

/**
 * Same as HolderNaive but with added synchronization. This implementation is thread safe, but each
 * {@link #getHeavy()} call costs additional synchronization overhead.
 */
@Slf4j
public class HolderThreadSafe {

  private Heavy heavy;

  /**
   * Constructor.
   */
  public HolderThreadSafe() {
    LOGGER.info("HolderThreadSafe created");
  }

  /**
   * Get heavy object.
   */
  public synchronized Heavy getHeavy() {
    if (heavy == null) {
      heavy = new Heavy();
    }
    return heavy;
  }
}

/**
 * This lazy loader is thread safe and more efficient than {@link HolderThreadSafe}. It utilizes
 * Java 8 functional interface {@link Supplier} as {@link Heavy} factory.
 */
@Slf4j
public class Java8Holder {

  private Supplier<Heavy> heavy = this::createAndCacheHeavy;

  public Java8Holder() {
    LOGGER.info("Java8Holder created");
  }

  public Heavy getHeavy() {
    return heavy.get();
  }

  private synchronized Heavy createAndCacheHeavy() {
    class HeavyFactory implements Supplier<Heavy> {
      private final Heavy heavyInstance = new Heavy();

      @Override
      public Heavy get() {
        return heavyInstance;
      }
    }

    if (!(heavy instanceof HeavyFactory)) {
      heavy = new HeavyFactory();
    }

    return heavy.get();
  }
}
```
## 双Buffer
```Java
/**
 * 双buffer渲染图形像素
 * Scene class. Render the output frame.
 */
@Slf4j
public class Scene {

  private final Buffer[] frameBuffers;

  private int current;

  private int next;

  /**
   * Constructor of Scene.
   */
  public Scene() {
    frameBuffers = new FrameBuffer[2];
    frameBuffers[0] = new FrameBuffer();
    frameBuffers[1] = new FrameBuffer();
    current = 0;
    next = 1;
  }

  /**
   * Draw the next frame.
   *
   * @param coordinateList list of pixels of which the color should be black
   */
  public void draw(List<? extends Pair<Integer, Integer>> coordinateList) {
    LOGGER.info("Start drawing next frame");
    LOGGER.info("Current buffer: " + current + " Next buffer: " + next);
    // 填充下一个buffer
    frameBuffers[next].clearAll();
    coordinateList.forEach(coordinate -> {
      var x = coordinate.getKey();
      var y = coordinate.getValue();
      frameBuffers[next].draw(x, y);
    });
    LOGGER.info("Swap current and next buffer");
    // 切换
    swap();
    LOGGER.info("Finish swapping");
    LOGGER.info("Current buffer: " + current + " Next buffer: " + next);
  }

  public Buffer getBuffer() {
    LOGGER.info("Get current buffer: " + current);
    return frameBuffers[current];
  }

  private void swap() {
    current = current ^ next;
    next = current ^ next;
    current = current ^ next;
  }

}
```
## 事件驱动架构（event-driven-architecture）
```java
/**
 * Handles the routing of {@link Event} messages to associated handlers. A {@link HashMap} is used
 * to store the association between events and their respective handlers.
 */
public class EventDispatcher {
  // 提前注册事件对应的处理器
  private final Map<Class<? extends Event>, Handler<? extends Event>> handlers;

  public EventDispatcher() {
    handlers = new HashMap<>();
  }

  /**
   * Links an {@link Event} to a specific {@link Handler}.
   *
   * @param eventType The {@link Event} to be registered
   * @param handler   The {@link Handler} that will be handling the {@link Event}
   */
  public <E extends Event> void registerHandler(
      Class<E> eventType,
      Handler<E> handler
  ) {
    handlers.put(eventType, handler);
  }

  /**
   * Dispatches an {@link Event} depending on it's type.
   *
   * @param event The {@link Event} to be dispatched
   */
  @SuppressWarnings("unchecked")
  public <E extends Event> void dispatch(E event) {
    var handler = (Handler<E>) handlers.get(event.getClass());
    if (handler != null) {
      handler.onEvent(event);
    }
  }

}
```

## 参考资料
[java-design-patterns](https://java-design-patterns.com/)