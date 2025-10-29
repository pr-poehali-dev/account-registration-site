-- Таблица для Google аккаунтов
CREATE TABLE IF NOT EXISTS google_accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для прокси
CREATE TABLE IF NOT EXISTS proxies (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port VARCHAR(10) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_checked TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для задач регистрации
CREATE TABLE IF NOT EXISTS registration_tasks (
    id SERIAL PRIMARY KEY,
    google_account_id INTEGER REFERENCES google_accounts(id),
    proxy_id INTEGER REFERENCES proxies(id),
    marktplaats_login VARCHAR(255),
    marktplaats_password VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_google_status ON google_accounts(status);
CREATE INDEX IF NOT EXISTS idx_proxy_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_task_status ON registration_tasks(status);
