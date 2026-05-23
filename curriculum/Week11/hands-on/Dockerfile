# HanaMall ステージング環境 Dockerfile
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Tokyo

# Apache インストール
RUN apt-get update && \
    apt-get install -y apache2 curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# HanaMall の Apache 設定をコピー
COPY apache2/hanamall.conf /etc/apache2/sites-available/
RUN a2ensite hanamall.conf && a2dissite 000-default.conf

# コンテンツをコピー
COPY html/ /var/www/html/

EXPOSE 80

# フォアグラウンドで Apache を起動
CMD ["apache2ctl", "-D", "FOREGROUND"]
