-- Migration: Admin Account Protection
-- This migration ensures that admin accounts can never be disabled

-- Add a check constraint to prevent admin accounts from being disabled
-- This constraint ensures that if an account has any admin users, the account must be active
ALTER TABLE accounts 
ADD CONSTRAINT chk_admin_account_active 
CHECK (
    NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.account_id = accounts.account_id 
        AND users.role = 'admin'
    ) OR accounts.is_active = true
);

-- Add a trigger to prevent admin users from being disabled
DELIMITER //
CREATE TRIGGER prevent_admin_user_disable
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    -- If trying to disable a user and they are admin, prevent it
    IF OLD.is_active = true AND NEW.is_active = false AND NEW.role = 'admin' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot disable admin users. Admin users must remain active.';
    END IF;
END//
DELIMITER ;

-- Add a trigger to prevent admin accounts from being disabled
DELIMITER //
CREATE TRIGGER prevent_admin_account_disable
BEFORE UPDATE ON accounts
FOR EACH ROW
BEGIN
    -- If trying to disable an account that has admin users, prevent it
    IF OLD.is_active = true AND NEW.is_active = false AND 
       EXISTS (SELECT 1 FROM users WHERE users.account_id = NEW.account_id AND users.role = 'admin') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot disable admin accounts. Admin accounts must remain active.';
    END IF;
END//
DELIMITER ; 