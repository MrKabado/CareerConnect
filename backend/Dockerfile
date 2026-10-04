FROM php:8.2-cli

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-interaction --no-scripts --prefer-dist

COPY . .

RUN composer dump-autoload --no-interaction --optimize --no-scripts

EXPOSE 8000