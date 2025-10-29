-- Таблица настроек автоматизации
CREATE TABLE IF NOT EXISTS automation_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Вставляем дефолтные настройки
INSERT INTO automation_settings (setting_key, setting_value) VALUES
    ('delay_min', '5'),
    ('delay_max', '15'),
    ('parallel_threads', '3'),
    ('auto_retry', 'true'),
    ('max_retries', '3'),
    ('use_random_delay', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Добавляем поле для хранения cookies в задачах
ALTER TABLE registration_tasks ADD COLUMN IF NOT EXISTS cookies_data TEXT;
