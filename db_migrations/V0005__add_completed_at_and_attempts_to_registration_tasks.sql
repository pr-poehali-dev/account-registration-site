ALTER TABLE t_p24911867_account_registration.registration_tasks 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;