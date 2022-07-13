---
title: jvm分析工具
date: '2022-4-26'
sidebar: 'auto'
categories:
- java
tags:
- jvm工具
---

#### jmap
内存分析工具

#### jstat
jvm运行状态分析工具

#### jstack
线程栈分析工具

#### 例子
背景：线上出现CPU负载过高
```bash
ps | jps 
// 获取进程pid
top -Hp pid
// 获取线程tid
printf '%x\n' nid
// 获取nid十六进制
jstack pid | grep -B 10 -A 10 nid-hex
// 获取线程nid栈信息（前后十行）
```

