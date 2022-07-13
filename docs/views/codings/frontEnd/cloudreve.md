---
title: 搭建个人云盘
tags:
- 个人云盘
categories:
- 应用
date: '2022-6-26'
sidebar: 'auto'
---
:::tip
平时需要在云端保存文件，因此自己搭建一个私人云盘，自己来维护，不用担心停服的问题。
:::
#### 步骤
1. 通过官网参考文档，安装cloudreve，配置进程守护；
2. 通过Nginx反向代理，申请云盘域名，并配置htpps证书；
```nginx
server {
        listen 80;
        server_name drive.wantengfeng.com;
        return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    # 设置成理论上传文件的最大值
    client_max_body_size 1024m;
    server_name drive.wantengfeng.com;
    access_log /var/log/nginx/https-drive-wantengfeng-access.log;
    error_log /var/log/nginx/https-drive-wantengfeng-error.log; 
    ssl_certificate  /etc/nginx/certs/drive.wantengfeng.com_bundle.crt; 
    ssl_certificate_key /etc/nginx/certs/drive.wantengfeng.com.key; 
    ssl_session_timeout 5m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    location / {
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header Host $http_host;
       proxy_redirect off;
       # 因为是容器，所以不能直接通过localhost访问母机服务，可以通过docker ip或者host模式访问母机
       # 通过docker ip比使用公网ip要快。
       proxy_pass  http://docker-ip:5212;
    }
}
```

#### 问题
1. 通过Nginx反向代理后，上传大文件会报413错误（Request entity too large 请求实体太大），不经过代理则没有该问题。  
解决办法：设置nginx的client_max_body_size的大小。
2. 设置完client_max_body_size后，上传大文件Nginx日志报timeout错误
```
2022/06/27 03:18:36 [error] 64#64: *1169 upstream timed out (110:Connection timed out) while sending request to upstream, client: ip, server: drive.wantengfeng.com, request: "POST /api/v3/file/upload HTTP/1.1", upstream: "http://ip:5212/api/v3
/file/upload", host: "drive.wantengfeng.com", referrer: "https://drive.wantengfeng.com/home?path=%2F%E4%B8%AA%E4%BA%BA%E6%96%87%E4%BB%
B6"
```
解决办法：配置proxy_read_timeout,proxy_write_timeout和proxy_connect_timeout并没有解决该问题，应用不至于这个慢，
于是想到proxy_pass是通过公网ip来访问的，改成docker ip速度应该会快一下，果然改完之后就解决了。
#### 参考文档
[cloudreve官网](https://docs.cloudreve.org/)