#!/usr/bin/env python3
"""
Migrate existing data to populate accounts table and update user records.
"""

import os
import sys
import uuid
from datetime import datetime, timezone
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import DATABASE_URL

def generate_user_id():
    """Generate a unique 12-character user ID"""
    return str(uuid.uuid4())[:12]

def migrate_account_user_data():
    """Migrate existing data to populate accounts and update users"""
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with SessionLocal() as db:
        print("🔄 Starting account and user data migration...")
        
        try:
            # Step 1: Get all existing users
            result = db.execute(text("SELECT account_id, username, email, full_name FROM users"))
            users = result.fetchall()
            
            print(f"📊 Found {len(users)} users to migrate")
            
            # Step 2: Create accounts for each user
            for user in users:
                account_id = user.account_id
                username = user.username
                email = user.email
                full_name = user.full_name
                
                # Create account
                account_name = full_name or username or email.split('@')[0]
                account_description = f"Account created for user {username or email}"
                
                db.execute(text("""
                    INSERT INTO accounts (
                        account_id, name, description, max_users, max_projects, 
                        plan_type, status, created_at, updated_at
                    ) VALUES (
                        :account_id, :name, :description, :max_users, :max_projects,
                        :plan_type, :status, :created_at, :updated_at
                    )
                """), {
                    'account_id': account_id,
                    'name': account_name,
                    'description': account_description,
                    'max_users': 1,  # Single user per account for now
                    'max_projects': 10,
                    'plan_type': 'free',
                    'status': 'active',
                    'created_at': datetime.now(timezone.utc),
                    'updated_at': datetime.now(timezone.utc)
                })
                
                print(f"✅ Created account for user {username or email}")
            
            # Step 3: Update users with user_id and is_root_user
            for user in users:
                account_id = user.account_id
                username = user.username
                email = user.email
                
                # Generate unique user_id
                user_id = generate_user_id()
                
                # Update user record
                db.execute(text("""
                    UPDATE users 
                    SET user_id = :user_id, is_root_user = :is_root_user
                    WHERE account_id = :account_id
                """), {
                    'user_id': user_id,
                    'is_root_user': True,  # All existing users are root users
                    'account_id': account_id
                })
                
                print(f"✅ Updated user {username or email} with user_id: {user_id}")
            
            # Step 4: Update all related tables to use user_id instead of account_id
            # Update api_keys
            db.execute(text("""
                UPDATE api_keys ak
                JOIN users u ON ak.user_account_id = u.account_id
                SET ak.user_id = u.user_id
                WHERE ak.user_account_id IS NOT NULL
            """))
            print("✅ Updated api_keys table")
            
            # Update billing_records
            db.execute(text("""
                UPDATE billing_records br
                JOIN users u ON br.user_account_id = u.account_id
                SET br.user_id = u.user_id
                WHERE br.user_account_id IS NOT NULL
            """))
            print("✅ Updated billing_records table")
            
            # Update notifications
            db.execute(text("""
                UPDATE notifications n
                JOIN users u ON n.user_account_id = u.account_id
                SET n.user_id = u.user_id
                WHERE n.user_account_id IS NOT NULL
            """))
            print("✅ Updated notifications table")
            
            # Update projects
            db.execute(text("""
                UPDATE projects p
                JOIN users u ON p.owner_account_id = u.account_id
                SET p.owner_user_id = u.user_id
                WHERE p.owner_account_id IS NOT NULL
            """))
            print("✅ Updated projects table")
            
            # Update sandbox_usage
            db.execute(text("""
                UPDATE sandbox_usage su
                JOIN users u ON su.user_account_id = u.account_id
                SET su.user_id = u.user_id
                WHERE su.user_account_id IS NOT NULL
            """))
            print("✅ Updated sandbox_usage table")
            
            # Update sandboxes
            db.execute(text("""
                UPDATE sandboxes s
                JOIN users u ON s.owner_account_id = u.account_id
                SET s.owner_user_id = u.user_id
                WHERE s.owner_account_id IS NOT NULL
            """))
            print("✅ Updated sandboxes table")
            
            # Update templates
            db.execute(text("""
                UPDATE templates t
                JOIN users u ON t.owner_account_id = u.account_id
                SET t.owner_user_id = u.user_id
                WHERE t.owner_account_id IS NOT NULL
            """))
            print("✅ Updated templates table")
            
            # Commit all changes
            db.commit()
            print("✅ Data migration completed successfully!")
            
            # Step 5: Verify migration
            print("\n📋 Migration verification:")
            
            # Check accounts
            result = db.execute(text("SELECT COUNT(*) as count FROM accounts"))
            row = result.fetchone()
            account_count = row[0] if row else 0
            print(f"   - Accounts created: {account_count}")
            
            # Check users with user_id
            result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE user_id IS NOT NULL"))
            row = result.fetchone()
            user_count = row[0] if row else 0
            print(f"   - Users with user_id: {user_count}")
            
            # Check root users
            result = db.execute(text("SELECT COUNT(*) as count FROM users WHERE is_root_user = 1"))
            row = result.fetchone()
            root_user_count = row[0] if row else 0
            print(f"   - Root users: {root_user_count}")
            
        except Exception as e:
            db.rollback()
            print(f"❌ Error during migration: {e}")
            raise

if __name__ == "__main__":
    migrate_account_user_data() 