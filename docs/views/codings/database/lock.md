---
title: lock
date: '2022-7-7'
---
## latch锁
show engine innodb mutex ;
## lock锁
show engine innodb status ;

##innodb行锁 
1.共享锁（S）2.排他锁（X）
##意向表锁
1.（IS）共享 2.(IX)排他

## 锁查看
select * from information_schema.INNODB_TRX;
select * from performance_schema.data_locks;
select * from performance_schema.data_lock_waits;

## mvcc（多版本控制） 非锁定的一致性读
select @@transaction_isolation; 查看事务级别
READ COMMITTED 总是读取最新版本，如果行被锁定，则读取该行版本的最新一个快照。缺点：隔离性不足
REPEATABLE READ 总是读取事务开始时的行数据

## 一致性锁定读
select ... for update
select ... lock in share mode

## 自增长与锁（auto-inc locking）
特殊的表锁机制，为了提高插入性能，锁不是在一个事务完成后释放，而是在完成对自增值
插入的SQL语句后立即释放（性能还是堪忧）,这是mysql老版本innodb_autoinc_lock_mode = 0的表现
show variables like 'innodb_autoinc_lock_mode' 目前有0，1，2三个选项

## 外键和锁
select ... lock in share mode （保证数据的一致性）

## 行锁算法
Record lock: 单个行记录上的锁，会锁住索引记录，如果没有任何索引，使用隐式的主键进行锁定
Gap lock: 间隙锁，锁定一个范围，但是不包含记录本身。为了防止多个事务将记录插入到同意范围内，导致幻读问题的产生。
next-key lock: gap lock + record lock 锁定一个范围，并且锁定记录本身，当查询的索引含有唯一属性时，next-key进行优化，
将其降级为record lock。

## 解决幻读问题
在默认的事务隔离级别下，Innodb采用next-key lock避免幻读问题。与其他数据库不同，它们需要在serializable的事务隔离级别下才能解决幻读
幻读是指在同一事务下，连续执行两个相同的SQL语句可能导致不同的结果，第二次的SQL语句可能返回之前不存在的行。
innodb存储引擎默认的事务级别为repeatable read，在该级别下，其采用next-key的方式来加锁。而在read committed下，其仅采用record lock。

## 锁问题
脏数据：事务对缓冲池中的行记录进行了修改，并且还没有被提交
脏读：在同步的事务下，当前事务可以读到另一个事务未提交的数据，即读到了脏数据
在read uncommitted会发生脏读。在一些特殊场景可以设置为该事务级别，比如replication环境中的slave节点，并且在该slave上的查询并不需要特别精确的返回值。
不可重复读：在一个事务内两次读取的数据不一致。
和脏读区别：脏读是读到了未提交的数据，不可重复读读到的却是已经提交的数据，但是其范围了数据库事务一致性的要求。
innodb存储引擎通过使用next-key lock算法来避免不可重复读的问题。在MySQL官方文档中将不可重复读定义为幻读。

## 丢失更新
1. 事务T1查询一行数据，放入本地内存，并显示一个终端用户User1。（银行客户端1读取余额为1000）
2. 事务T2也查询该行数据，并将取得的数据显示给终端用户User2。（银行客户端2读取余额为1000）
3. User1修改这行记录，更新数据库并提交。（转账900，剩余100，更新数据库）
4. User2修改这行记录，更新数据库并提交。（转账1，剩余999，更新数据库）
解决办法：在步骤1，2读取时加上排他X锁

## 阻塞
innodb_lock_wait_timeout：控制阻塞等待时间
innodb_rollback_on_timeout: 是否在超时时对进行的事务进行回滚操作（默认为OFF，代表不回滚）
```shell script
show variables like 'innodb_lock_wait_time';
show variables like 'innodb_rollback_on_timeout'
```

## 死锁
1. 通过超时回滚解决，根据FIFO的顺序进行回滚，可能选择回滚的对象不合适，占用较多时间。
2. wait-for graph(等待图) 较为主动的检测方式，记录了锁的信息链表和事务等待链表。若检测存在回路，则代表有死锁，选择回滚undo量最小的事务。
备注：mysql innodb引擎可以检测到死锁，发现死锁后，马上回滚一个事务。

## 参考
mysql技术内幕 innodb存储引擎




