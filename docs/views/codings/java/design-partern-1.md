---
title: 设计模式（1）
date: '2022-6-30'
---
## 构建器模式（builder）
```java
public final class Hero {

  private final Profession profession;
  private final String name;
  private final HairType hairType;
  private final HairColor hairColor;
  private final Armor armor;
  private final Weapon weapon;
  // 构造函数私有化，只能通过builder进行构建
  private Hero(Builder builder) {
    this.profession = builder.profession;
    this.name = builder.name;
    this.hairColor = builder.hairColor;
    this.hairType = builder.hairType;
    this.weapon = builder.weapon;
    this.armor = builder.armor;
  }

  public Profession getProfession() {
    return profession;
  }

  public String getName() {
    return name;
  }

  public HairType getHairType() {
    return hairType;
  }

  public HairColor getHairColor() {
    return hairColor;
  }

  public Armor getArmor() {
    return armor;
  }

  public Weapon getWeapon() {
    return weapon;
  }

  @Override
  public String toString() {

    var sb = new StringBuilder();
    sb.append("This is a ")
        .append(profession)
        .append(" named ")
        .append(name);
    if (hairColor != null || hairType != null) {
      sb.append(" with ");
      if (hairColor != null) {
        sb.append(hairColor).append(' ');
      }
      if (hairType != null) {
        sb.append(hairType).append(' ');
      }
      sb.append(hairType != HairType.BALD ? "hair" : "head");
    }
    if (armor != null) {
      sb.append(" wearing ").append(armor);
    }
    if (weapon != null) {
      sb.append(" and wielding a ").append(weapon);
    }
    sb.append('.');
    return sb.toString();
  }

  /**
   * The builder class.通过该类进行构建。
   */
  public static class Builder {

    private final Profession profession;
    private final String name;
    private HairType hairType;
    private HairColor hairColor;
    private Armor armor;
    private Weapon weapon;

    /**
     * Constructor.
     */
    public Builder(Profession profession, String name) {
      if (profession == null || name == null) {
        throw new IllegalArgumentException("profession and name can not be null");
      }
      this.profession = profession;
      this.name = name;
    }

    public Builder withHairType(HairType hairType) {
      this.hairType = hairType;
      return this;
    }

    public Builder withHairColor(HairColor hairColor) {
      this.hairColor = hairColor;
      return this;
    }

    public Builder withArmor(Armor armor) {
      this.armor = armor;
      return this;
    }

    public Builder withWeapon(Weapon weapon) {
      this.weapon = weapon;
      return this;
    }

    public Hero build() {
      return new Hero(this);
    }
  }
}
```

## 工厂模式
```java
// 产品种类，coin为接口，CopperCoin和GoldCoin为具体对象，这样限制了使用者的输入，减少出错。
@RequiredArgsConstructor
@Getter
public enum CoinType {

  COPPER(CopperCoin::new),
  GOLD(GoldCoin::new);

  private final Supplier<Coin> constructor;
}

public class CoinFactory {

  /**
   * Factory method takes as a parameter the coin type and calls the appropriate class.
   */
  public static Coin getCoin(CoinType type) {
    return type.getConstructor().get();
  }
}
```

## 状态模式
```java
/**
 * Mammoth has internal state that defines its behavior.
 */
public class Mammoth {
  
  // 内部维护一个状态，每个状态里有不同的行为
  private State state;

  public Mammoth() {
    state = new PeacefulState(this);
  }

  /**
   * Makes time pass for the mammoth.
   */
  public void timePasses() {
    if (state.getClass().equals(PeacefulState.class)) {
      changeStateTo(new AngryState(this));
    } else {
      changeStateTo(new PeacefulState(this));
    }
  }

  private void changeStateTo(State newState) {
    this.state = newState;
    this.state.onEnterState();
  }

  @Override
  public String toString() {
    return "The mammoth";
  }

  public void observe() {
    this.state.observe();
  }
}
```
## 网关（api-gateway）
```java
/**
 * The ApiGateway aggregates calls to microservices based on the needs of the individual clients.
 * 聚合imageClient和priceClient
 */
@RestController
public class ApiGateway {

  @Resource
  private ImageClient imageClient;

  @Resource
  private PriceClient priceClient;

  /**
   * Retrieves product information that desktop clients need.
   *
   * @return Product information for clients on a desktop
   */
  @GetMapping("/desktop")
  public DesktopProduct getProductDesktop() {
    var desktopProduct = new DesktopProduct();
    desktopProduct.setImagePath(imageClient.getImagePath());
    desktopProduct.setPrice(priceClient.getPrice());
    return desktopProduct;
  }

  /**
   * Retrieves product information that mobile clients need.
   *
   * @return Product information for clients on a mobile device
   */
  @GetMapping("/mobile")
  public MobileProduct getProductMobile() {
    var mobileProduct = new MobileProduct();
    mobileProduct.setPrice(priceClient.getPrice());
    return mobileProduct;
  }
}
```

## 熔断器（CircuitBreaker）
```java
/**
 * The delay based Circuit breaker implementation that works in a
 * CLOSED->OPEN-(retry_time_period)->HALF_OPEN->CLOSED flow with some retry time period for failed
 * services and a failure threshold for service to open circuit.
 */
public class DefaultCircuitBreaker implements CircuitBreaker {

  private final long timeout;
  // 重试周期
  private final long retryTimePeriod;
  private final RemoteService service;
  long lastFailureTime;
  private String lastFailureResponse;
  int failureCount;
  private final int failureThreshold;
  private State state;
  private final long futureTime = 1000 * 1000 * 1000 * 1000;

  /**
   * Constructor to create an instance of Circuit Breaker.
   *
   * @param timeout          Timeout for the API request. Not necessary for this simple example
   * @param failureThreshold Number of failures we receive from the depended service before changing
   *                         state to 'OPEN'
   * @param retryTimePeriod  Time period after which a new request is made to remote service for
   *                         status check.
   */
  DefaultCircuitBreaker(RemoteService serviceToCall, long timeout, int failureThreshold,
      long retryTimePeriod) {
    this.service = serviceToCall;
    // We start in a closed state hoping that everything is fine
    this.state = State.CLOSED;
    this.failureThreshold = failureThreshold;
    // Timeout for the API request.
    // Used to break the calls made to remote resource if it exceeds the limit
    this.timeout = timeout;
    this.retryTimePeriod = retryTimePeriod;
    //An absurd amount of time in future which basically indicates the last failure never happened
    this.lastFailureTime = System.nanoTime() + futureTime;
    this.failureCount = 0;
  }

  // Reset everything to defaults
  @Override
  public void recordSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = System.nanoTime() + futureTime;
    this.state = State.CLOSED;
  }

  @Override
  public void recordFailure(String response) {
    failureCount = failureCount + 1;
    this.lastFailureTime = System.nanoTime();
    // Cache the failure response for returning on open state
    this.lastFailureResponse = response;
  }

  // Evaluate the current state based on failureThreshold, failureCount and lastFailureTime.
  protected void evaluateState() {
    if (failureCount >= failureThreshold) { //Then something is wrong with remote service
      if ((System.nanoTime() - lastFailureTime) > retryTimePeriod) {
        //We have waited long enough and should try checking if service is up
        state = State.HALF_OPEN;
      } else {
        //Service would still probably be down
        state = State.OPEN;
      }
    } else {
      //Everything is working fine
      state = State.CLOSED;
    }
  }

  @Override
  public String getState() {
    evaluateState();
    return state.name();
  }

  /**
   * Break the circuit beforehand if it is known service is down Or connect the circuit manually if
   * service comes online before expected.
   *
   * @param state State at which circuit is in
   */
  @Override
  public void setState(State state) {
    this.state = state;
    switch (state) {
      case OPEN:
        this.failureCount = failureThreshold;
        this.lastFailureTime = System.nanoTime();
        break;
      case HALF_OPEN:
        this.failureCount = failureThreshold;
        this.lastFailureTime = System.nanoTime() - retryTimePeriod;
        break;
      default:
        this.failureCount = 0;
    }
  }

  /**
   * Executes service call.
   *
   * @return Value from the remote resource, stale response or a custom exception
   */
  @Override
  public String attemptRequest() throws RemoteServiceException {
    evaluateState();
    if (state == State.OPEN) {
      // return cached response if the circuit is in OPEN state
      return this.lastFailureResponse;
    } else {
      // Make the API request if the circuit is not OPEN
      try {
        //In a real application, this would be run in a thread and the timeout
        //parameter of the circuit breaker would be utilized to know if service
        //is working. Here, we simulate that based on server response itself
        var response = service.call();
        // Yay!! the API responded fine. Let's reset everything.
        recordSuccess();
        return response;
      } catch (RemoteServiceException ex) {
        recordFailure(ex.getMessage());
        throw ex;
      }
    }
  }
}
```
##流水线（pipeline）
```java
/**
 * Main Pipeline class that initially sets the current handler. Processed output of the initial
 * handler is then passed as the input to the next stage handlers.
 *
 * @param <I> the type of the input for the first stage handler
 * @param <O> the final stage handler's output type
 */
class Pipeline<I, O> {

  private final Handler<I, O> currentHandler;

  Pipeline(Handler<I, O> currentHandler) {
    this.currentHandler = currentHandler;
  }

  <K> Pipeline<I, K> addHandler(Handler<O, K> newHandler) {
    return new Pipeline<>(input -> newHandler.process(currentHandler.process(input)));
  }

  O execute(I input) {
    return currentHandler.process(input);
  }
}

public class App {
  /**
   * Specify the initial input type for the first stage handler and the expected output type of the
   * last stage handler as type parameters for Pipeline. Use the fluent builder by calling
   * addHandler to add more stage handlers on the pipeline.
   */
  public static void main(String[] args) {
    /*
      Suppose we wanted to pass through a String to a series of filtering stages and convert it
      as a char array on the last stage.

      - Stage handler 1 (pipe): Removing the alphabets, accepts a String input and returns the
      processed String output. This will be used by the next handler as its input.

      - Stage handler 2 (pipe): Removing the digits, accepts a String input and returns the
      processed String output. This shall also be used by the last handler we have.

      - Stage handler 3 (pipe): Converting the String input to a char array handler. We would
      be returning a different type in here since that is what's specified by the requirement.
      This means that at any stages along the pipeline, the handler can return any type of data
      as long as it fulfills the requirements for the next handler's input.

      Suppose we wanted to add another handler after ConvertToCharArrayHandler. That handler
      then is expected to receive an input of char[] array since that is the type being returned
      by the previous handler, ConvertToCharArrayHandler.
     */
    var filters = new Pipeline<>(new RemoveAlphabetsHandler())
        .addHandler(new RemoveDigitsHandler())
        .addHandler(new ConvertToCharArrayHandler());
    filters.execute("GoYankees123!");
  }
}
```
## 参考资料
[java-design-patterns](https://java-design-patterns.com/)

