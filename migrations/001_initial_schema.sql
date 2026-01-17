-- Migration script for Cloud Sync feature
-- Run this in the Neon SQL Editor

-- 1. Create table for backups
CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(16) PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_ip VARCHAR(45)
);

-- 2. Create table for rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    action VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- 3. Create index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_timestamp ON rate_limits(ip, timestamp);

-- 4. Create index for backups lookup (though Primary Key already handles id)
-- Just ensuring we have what we need.
