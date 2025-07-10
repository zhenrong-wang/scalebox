CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> be0612073e71

DROP TABLE email_verification_tokens;

DROP TABLE password_reset_tokens;

ALTER TABLE users ADD COLUMN full_name VARCHAR(100);

ALTER TABLE users ADD COLUMN `role` VARCHAR(20);

ALTER TABLE users ADD COLUMN is_active BOOL;

ALTER TABLE users ADD COLUMN verification_token VARCHAR(255);

ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);

ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME;

ALTER TABLE users ADD COLUMN last_login DATETIME;

ALTER TABLE users CHANGE created_at created_at DATETIME NULL DEFAULT current_timestamp();

ALTER TABLE users CHANGE updated_at updated_at DATETIME NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

DROP INDEX email ON users;

DROP INDEX username ON users;

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_id ON users (id);

CREATE UNIQUE INDEX ix_users_username ON users (username);

ALTER TABLE users DROP COLUMN name;

INSERT INTO alembic_version (version_num) VALUES ('be0612073e71');

-- Running upgrade be0612073e71 -> 87bb50aeea65

CREATE TABLE pending_signups (
    id INTEGER NOT NULL AUTO_INCREMENT, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    full_name VARCHAR(100), 
    verification_code VARCHAR(10) NOT NULL, 
    created_at DATETIME, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_pending_signups_email ON pending_signups (email);

CREATE INDEX ix_pending_signups_id ON pending_signups (id);

UPDATE alembic_version SET version_num='87bb50aeea65' WHERE alembic_version.version_num = 'be0612073e71';

-- Running upgrade 87bb50aeea65 -> ce54d03dff09

ALTER TABLE users ADD COLUMN account_id VARCHAR(36);

CREATE UNIQUE INDEX ix_users_account_id ON users (account_id);

SELECT id FROM users WHERE account_id IS NULL OR account_id = "";

