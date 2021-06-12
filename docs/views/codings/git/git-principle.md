---
title: git内部原理
date: '2021-5-21'
sidebar: 'true'
categories:
- git
tags:
- git
publish: true
---
:::tip
身为程序员，肯定要和git打交道，但是之前一直对git一知半解，不了解其中的原理，导致出现问题时不知道怎么修复，最近看了一篇讲git原理的文章，讲的很好，
因此记录一下学习笔记，原文见章尾。
:::

## git object类型
- blob 负责存储每个文件的内容，执行git add命令时生成相应的blob；
- tree 负责存储当前目录结构，以及每个文件的权限、类型、对应身份证（SHA1值）、以及文件名；
- commit 负责存储一个提交信息，包括对应目录结构的tree的哈希值，上一个提交commit的哈希值，提交的作者以及提交的具体日期，最后是提交的信息（-m 参数）

## 例子
```bash
//初始化 git
>> git init
// 添加文件
>> echo 'wonderful' > a.txt
>> echo 'wantengfeng' > b.txt
// 执行git add
>> git add .
// 查看.git/objects
>> tree .git/objects
├── objects
│   ├── 24
│   │   └── e23f5fb8628096b07ff49760b5d29b65c2c997
│   ├── 2e
│   │   └── 12dc031e0352d3e9d4ad41ba18916eecac4ac9
│   ├── info
│   └── pack
// 查看object类型
>> git cat-file -t 24e2
blob
// 查看内容
>> git cat-file -p 24e2
wonderful
// 执行git commit
>> git commit -m 'init'
// 查看.git/objects，多了一些object
>> tree .git/objects
├── b1
│   └── 0b8a871e78c29d55cd183b913116385c6a4382
├── f2
│   └── 34d6c7d82bfb3120a4607ffdb350e2f92212b6
// 其中一个为tree类型，内容如下：
100644 blob 24e23f5fb8628096b07ff49760b5d29b65c2c997    a.txt
100644 blob 2e12dc031e0352d3e9d4ad41ba18916eecac4ac9    b.txt
// 另一个为commit类型，内容为：
tree f234d6c7d82bfb3120a4607ffdb350e2f92212b6
author jameswan <jameswan@tencent.com> 1621595017 +0800
committer jameswan <jameswan@tencent.com> 1621595017 +0800

init

// head指针
>> cat .git/HEAD
ref: refs/heads/master
// master指针，执行当前commit
>> cat .git/refs/heads/master
b10b8a871e78c29d55cd183b913116385c6a4382

// 修改a.txt中的内容，然后add提交，会重新生成一个blob对象；
// commit提交，会生成新的tree和commit对象，head指针和master指针会移动到对应提交点；
```

## git分区
- 工作目录（working directory） 操作系统上的文件，代码开发编辑在这里完成；
- 索引（index or staging area） 可以理解为暂存区域，index负责指向所有文件的最新add版本，这个版本的代码会在下一次commit被提交到git仓库；
- git仓库（git repository） 由 git object记录着每一次提交的快照，以及链式结构记录的提交变更；

![git-principle](https://www.lzane.com/tech/git-internal/git-update-file.gif)
## 参考文章
[这才是真正的GIT-GIT内部原理](https://www.lzane.com/tech/git-internal/)
