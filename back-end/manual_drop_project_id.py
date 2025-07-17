#!/usr/bin/env python3

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_NAME = os.getenv('DB_NAME', 'scalebox')

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

def drop_project_id_column():
    """Drop project_id column from api_keys table"""
    try:
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("DESCRIBE api_keys"))
            columns = [row[0] for row in result.fetchall()]
            
            if 'project_id' in columns:
                print("Dropping project_id column...")
                
                # Drop constraints first
                try:
                    conn.execute(text("ALTER TABLE api_keys DROP CONSTRAINT unique_api_key_name_per_project"))
                    print("✓ Dropped unique constraint")
                except:
                    print("Unique constraint already dropped or doesn't exist")
                
                try:
                    conn.execute(text("ALTER TABLE api_keys DROP CONSTRAINT api_keys_project_id_fkey"))
                    print("✓ Dropped foreign key constraint")
                except:
                    print("Foreign key constraint already dropped or doesn't exist")
                
                try:
                    conn.execute(text("DROP INDEX ix_api_keys_project_id ON api_keys"))
                    print("✓ Dropped index")
                except:
                    print("Index already dropped or doesn't exist")
                
                # Drop the column
                conn.execute(text("ALTER TABLE api_keys DROP COLUMN project_id"))
                print("✓ Dropped project_id column")
                
                # Add back the user-level unique constraint (if it doesn't exist)
                try:
                    conn.execute(text("ALTER TABLE api_keys ADD CONSTRAINT unique_api_key_name_per_user UNIQUE (user_account_id, name)"))
                    print("✓ Added user-level unique constraint")
                except:
                    print("User-level unique constraint already exists")
                
                conn.commit()
                print("✓ Migration completed successfully!")
                return True
            else:
                print("project_id column doesn't exist - already removed")
                return True
                
    except Exception as e:
        print(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    print("Manually dropping project_id column...")
    success = drop_project_id_column()
    if success:
        print("Migration successful!")
    else:
        print("Migration failed!")
        sys.exit(1) 