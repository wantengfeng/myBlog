---
title: MySql性能优化
date: '2022-6-29'
---
:::tip
性能是程序员关注的很重要的一个元素，面试也常常问到MySql的性能优化经验
:::

## 慢Sql
#### 慢Sql驱动因素
1. 业务驱动
2. 测试驱动
3. 慢查询日志
#### 慢查询日志
```shell script
# 查看是否开启慢查询日志
show variables like 'slow_query_log'  
# 设置慢查询
set global slow_query_log = on  
set global slow_query_log_file = '/var/lib/mysql/test-slow.log'  
# 未使用索引的语句添加到慢查询日志中 
set global log_queries_not_using_indexes = on  
set global long_query_time = 0.1 (秒) 
```
日志格式
```
Time :日志记录的时间  
User@Host:执行的用户及主机  
Query_time:查询耗费时间  
Lock_time 锁表时间  
Rows_sent 发送给请求方的记录条数  
Rows_examined 语句扫描的记录条数  
SET timestamp 语句执行的时间点  
select .... 执行的具体语句  
```
慢查询分析工具
```shell script
mysqldumpslow -t 10 -s at /var/lib/mysql/test-slow.log 

# 帮助文档
jameswan@JAMESWAN-MB0 ~ % mysqldumpslow --help
Usage: mysqldumpslow [ OPTS... ] [ LOGS... ]

Parse and summarize the MySQL slow query log. Options are

  --verbose    verbose
  --debug      debug
  --help       write this text to standard output

  -v           verbose
  -d           debug
  -s ORDER     what to sort by (al, at, ar, c, l, r, t), 'at' is default
                al: average lock time
                ar: average rows sent
                at: average query time
                 c: count
                 l: lock time
                 r: rows sent
                 t: query time
  -r           reverse the sort order (largest last instead of first)
  -t NUM       just show the top n queries
  -a           don't abstract all numbers to N and strings to 'S'
  -n NUM       abstract numbers with at least n digits within names
  -g PATTERN   grep: only consider stmts that include this string
  -h HOSTNAME  hostname of db server for *-slow.log filename (can be wildcard),
               default is '*', i.e. match all
  -i NAME      name of server instance (if using mysql.server startup script)
  -l           don't subtract lock time from total time
```

## 参考文档
[mysql优化](https://github.com/YufeizhangRay/MySQL)