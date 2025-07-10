-- API Key Management Schema
-- This creates a production-ready API key system with proper security and tracking

CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key_id VARCHAR(64) UNIQUE NOT NULL, -- Unique identifier for the key
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL, -- Human-readable name for the key
    key_hash VARCHAR(255) NOT NULL, -- Hashed version of the actual API key
    prefix VARCHAR(16) NOT NULL, -- First 16 chars of the key for display
    permissions JSON, -- JSON object defining permissions
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL, -- NULL means never expires
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_key_id (key_id),
    INDEX idx_prefix (prefix),
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
);

-- API Key Usage Logging Table
CREATE TABLE IF NOT EXISTS api_key_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms INT,
    ip_address VARCHAR(45), -- IPv6 compatible
    user_agent TEXT,
    request_size_bytes INT,
    response_size_bytes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Indexes for performance and analytics
    INDEX idx_api_key_id (api_key_id),
    INDEX idx_created_at (created_at),
    INDEX idx_endpoint (endpoint),
    INDEX idx_status_code (status_code)
);

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    window_start TIMESTAMP NOT NULL, -- Start of the rate limit window
    request_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate windows
    UNIQUE KEY unique_key_window (api_key_id, window_start),
    
    -- Indexes for performance
    INDEX idx_api_key_window (api_key_id, window_start),
    INDEX idx_window_start (window_start)
); 