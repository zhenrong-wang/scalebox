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

def check_column_exists():
    """Check if project_id column already exists"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE api_keys"))
            columns = [row[0] for row in result.fetchall()]
            return 'project_id' in columns
    except Exception as e:
        print(f"Error checking column: {e}")
        return False

def add_project_id_column():
    """Add project_id column to api_keys table"""
    try:
        with engine.connect() as conn:
            # Check if column exists
            if check_column_exists():
                print("project_id column already exists!")
                return True
            
            # Add the column as nullable first
            print("Adding project_id column...")
            conn.execute(text("ALTER TABLE api_keys ADD COLUMN project_id VARCHAR(36)"))
            
            # Update existing API keys to point to default projects
            print("Updating existing API keys...")
            
            # Get all users who have API keys
            users_result = conn.execute(text("SELECT DISTINCT user_account_id FROM api_keys WHERE project_id IS NULL"))
            users = users_result.fetchall()
            
            for user_row in users:
                user_account_id = user_row[0]
                
                # Get the default project for this user
                project_result = conn.execute(
                    text("SELECT project_id FROM projects WHERE owner_account_id = :user_id AND is_default = 1"),
                    {"user_id": user_account_id}
                )
                project = project_result.fetchone()
                
                if project:
                    # Update all API keys for this user to point to their default project
                    conn.execute(
                        text("UPDATE api_keys SET project_id = :project_id WHERE user_account_id = :user_id AND project_id IS NULL"),
                        {"project_id": project[0], "user_id": user_account_id}
                    )
                    print(f"Updated API keys for user {user_account_id} to project {project[0]}")
            
            # Make the column NOT NULL
            print("Making project_id NOT NULL...")
            conn.execute(text("ALTER TABLE api_keys MODIFY COLUMN project_id VARCHAR(36) NOT NULL"))
            
            # Add index and constraints
            print("Adding index and constraints...")
            conn.execute(text("CREATE INDEX ix_api_keys_project_id ON api_keys (project_id)"))
            conn.execute(text("ALTER TABLE api_keys ADD CONSTRAINT unique_api_key_name_per_project UNIQUE (user_account_id, project_id, name)"))
            conn.execute(text("ALTER TABLE api_keys ADD CONSTRAINT api_keys_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(project_id)"))
            
            # Drop old constraint
            conn.execute(text("DROP INDEX unique_api_key_name_per_user ON api_keys"))
            
            conn.commit()
            print("Migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"Error during migration: {e}")
        return False

if __name__ == "__main__":
    print("Starting manual migration...")
    success = add_project_id_column()
    if success:
        print("Migration successful!")
    else:
        print("Migration failed!")
        sys.exit(1) 