-- Добавляем уникальный индекс для прокси чтобы избежать дубликатов
CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_unique ON proxies(host, port);
