#!/usr/bin/env python3
"""
Clean up migration artifacts and prepare database for Account/User separation migration.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError
from app.database import DATABASE_URL

def cleanup_migration_artifacts():
    """Clean up any partial migration artifacts"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("🔄 Cleaning up migration artifacts...")
        
        # Start transaction
        trans = conn.begin()
        
        try:
            # 1. Drop accounts table if it exists
            try:
                conn.execute(text("DROP TABLE IF EXISTS accounts"))
                print("✅ Dropped accounts table")
            except Exception as e:
                print(f"⚠️  Could not drop accounts table: {e}")
            
            # 2. Drop foreign key constraints that might reference user_id
            try:
                # Check for foreign keys on api_keys table
                result = conn.execute(text("""
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = 'scalebox' 
                    AND TABLE_NAME = 'api_keys' 
                    AND REFERENCED_TABLE_NAME = 'users'
                """))
                fk_constraints = [row[0] for row in result.fetchall()]
                
                for constraint in fk_constraints:
                    try:
                        conn.execute(text(f"ALTER TABLE api_keys DROP FOREIGN KEY {constraint}"))
                        print(f"✅ Dropped foreign key constraint: {constraint}")
                    except Exception as e:
                        print(f"⚠️  Could not drop constraint {constraint}: {e}")
            except Exception as e:
                print(f"⚠️  Error checking foreign keys: {e}")
            
            # 3. Drop indexes that might reference user_id
            try:
                # Check for indexes on api_keys table
                result = conn.execute(text("""
                    SELECT INDEX_NAME 
                    FROM information_schema.STATISTICS 
                    WHERE TABLE_SCHEMA = 'scalebox' 
                    AND TABLE_NAME = 'api_keys' 
                    AND COLUMN_NAME = 'user_id'
                """))
                indexes = [row[0] for row in result.fetchall()]
                
                for index in indexes:
                    try:
                        conn.execute(text(f"ALTER TABLE api_keys DROP INDEX {index}"))
                        print(f"✅ Dropped index: {index}")
                    except Exception as e:
                        print(f"⚠️  Could not drop index {index}: {e}")
            except Exception as e:
                print(f"⚠️  Error checking indexes: {e}")
            
            # 4. Drop user_id column from api_keys if it exists
            try:
                conn.execute(text("ALTER TABLE api_keys DROP COLUMN user_id"))
                print("✅ Dropped user_id column from api_keys")
            except Exception as e:
                print(f"⚠️  Could not drop user_id from api_keys: {e}")
            
            # 5. Drop user_id column from users if it exists
            try:
                conn.execute(text("ALTER TABLE users DROP COLUMN user_id"))
                print("✅ Dropped user_id column from users")
            except Exception as e:
                print(f"⚠️  Could not drop user_id from users: {e}")
            
            # 6. Drop is_root_user column from users if it exists
            try:
                conn.execute(text("ALTER TABLE users DROP COLUMN is_root_user"))
                print("✅ Dropped is_root_user column from users")
            except Exception as e:
                print(f"⚠️  Could not drop is_root_user from users: {e}")
            
            # Commit all changes
            trans.commit()
            print("✅ Database cleanup completed successfully")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Error during cleanup: {e}")
            raise

if __name__ == "__main__":
    cleanup_migration_artifacts() 