#!/usr/bin/env python3
"""
Script to check database state and clean up partial migration artifacts.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text

def check_db_state():
    """Check the current database state."""
    db = SessionLocal()
    
    try:
        # Check if accounts table exists
        result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'scalebox' AND table_name = 'accounts'
        """))
        row = result.fetchone()
        accounts_exists = row[0] > 0 if row else False
        
        if accounts_exists:
            print("⚠️  Accounts table already exists. Checking if it's empty...")
            
            # Check if accounts table has data
            result = db.execute(text("SELECT COUNT(*) as count FROM accounts"))
            row = result.fetchone()
            accounts_count = row[0] if row else 0
            
            if accounts_count == 0:
                print("✅ Accounts table exists but is empty. Dropping it...")
                db.execute(text("DROP TABLE accounts"))
                db.commit()
                print("✅ Dropped empty accounts table.")
            else:
                print(f"⚠️  Accounts table has {accounts_count} records.")
                
                # Show the accounts data
                result = db.execute(text("SELECT * FROM accounts"))
                accounts = result.fetchall()
                print("Accounts data:")
                for account in accounts:
                    print(f"  - {account}")
                
                # Force drop the table for migration
                print("🔄 Force dropping accounts table for migration...")
                db.execute(text("DROP TABLE accounts"))
                db.commit()
                print("✅ Force dropped accounts table.")
        else:
            print("✅ Accounts table does not exist.")
        
        # Check if any new columns exist in users table
        result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_schema = 'scalebox' 
            AND table_name = 'users' 
            AND column_name = 'user_id'
        """))
        row = result.fetchone()
        user_id_exists = row[0] > 0 if row else False
        
        if user_id_exists:
            print("⚠️  user_id column already exists in users table. Dropping it...")
            db.execute(text("ALTER TABLE users DROP COLUMN user_id"))
            db.commit()
            print("✅ Dropped user_id column.")
        
        result = db.execute(text("""
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_schema = 'scalebox' 
            AND table_name = 'users' 
            AND column_name = 'is_root_user'
        """))
        row = result.fetchone()
        is_root_user_exists = row[0] > 0 if row else False
        
        if is_root_user_exists:
            print("⚠️  is_root_user column already exists in users table. Dropping it...")
            db.execute(text("ALTER TABLE users DROP COLUMN is_root_user"))
            db.commit()
            print("✅ Dropped is_root_user column.")
        
        # Check for other new columns that might exist
        new_columns = [
            ('api_keys', 'user_id'),
            ('billing_records', 'user_id'),
            ('notifications', 'user_id'),
            ('projects', 'owner_user_id'),
            ('sandbox_usage', 'user_id'),
            ('sandboxes', 'owner_user_id'),
            ('templates', 'owner_user_id')
        ]
        
        for table, column in new_columns:
            result = db.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.columns 
                WHERE table_schema = 'scalebox' 
                AND table_name = :table 
                AND column_name = :column
            """), {'table': table, 'column': column})
            
            row = result.fetchone()
            if row and row[0] > 0:
                print(f"⚠️  {column} column already exists in {table} table. Dropping it...")
                db.execute(text(f"ALTER TABLE {table} DROP COLUMN {column}"))
                db.commit()
                print(f"✅ Dropped {column} column from {table}.")
        
        print("✅ Database state cleaned up successfully.")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during database state check: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Checking database state...")
    if check_db_state():
        print("✅ Database is ready for migration.")
    else:
        print("❌ Database state needs manual intervention.")
        sys.exit(1) 