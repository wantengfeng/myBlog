---
title: nginx容器代理blog
date: '2022-6-23'
sidebar: 'auto'
categories:
- 前端
tags:
- nginx
- docker
---
:::tip
在腾讯云上使用nginx容器代理blog静态界面，并配置https证书
:::
1. 首先通过参考文档配置好nginx的配置目录，日志目录以及网页目录
2. 配置nginx.conf，下载并配置证书
```nginx
server {
        listen 80;
        server_name www.wantengfeng.com;
        return 301 https://$host$request_uri;
}

server {
   listen 443 ssl;
    server_name www.wantengfeng.com;
    access_log /var/log/nginx/https-www-wantengfeng-access.log;
    error_log /var/log/nginx/https-www-wantengfeng-error.log; 
    ssl_certificate  /etc/nginx/certs/wantengfeng.com_bundle.crt; 
    ssl_certificate_key /etc/nginx/certs/wantengfeng.com.key; 
    ssl_session_timeout 5m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
    }
}
```
3. 启动容器
```shell script
# 启动
docker container run --rm --name mynginx --volume "$PWD/conf":/etc/nginx --volume "$PWD/html":/usr/share/nginx/html --volume "$PWD/log":/var/log/nginx -p 80:80 -p 443:443 -d nginx
# 重启
docker restart mynginx
```

#### 参考
[nginx容器](https://www.ruanyifeng.com/blog/2018/02/nginx-docker.html)