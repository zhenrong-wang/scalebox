#!/usr/bin/env python3
"""
Script to migrate sandboxes to ensure they all have a project assigned.
This should be run before the database migration to separate accounts and users.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from sqlalchemy import text

def migrate_sandboxes_to_projects():
    """Ensure all sandboxes have a project assigned."""
    db = SessionLocal()
    
    try:
        # Find sandboxes without a project using raw SQL
        result = db.execute(text("""
            SELECT id, sandbox_id, name, owner_account_id 
            FROM sandboxes 
            WHERE project_id IS NULL
        """))
        orphaned_sandboxes = result.fetchall()
        
        if not orphaned_sandboxes:
            print("✅ All sandboxes already have projects assigned.")
            return
        
        print(f"Found {len(orphaned_sandboxes)} sandboxes without projects. Migrating...")
        
        # Group sandboxes by owner
        sandboxes_by_owner = {}
        for sandbox in orphaned_sandboxes:
            owner_id = sandbox.owner_account_id
            if owner_id not in sandboxes_by_owner:
                sandboxes_by_owner[owner_id] = []
            sandboxes_by_owner[owner_id].append(sandbox)
        
        # For each owner, create a default project if needed and assign sandboxes
        for owner_id, sandboxes in sandboxes_by_owner.items():
            # Get or create default project for this owner
            result = db.execute(text("""
                SELECT project_id, name 
                FROM projects 
                WHERE owner_account_id = :owner_id AND is_default = TRUE
            """), {'owner_id': owner_id})
            default_project = result.fetchone()
            
            if not default_project:
                # Create default project
                result = db.execute(text("""
                    SELECT username FROM users WHERE account_id = :owner_id
                """), {'owner_id': owner_id})
                user = result.fetchone()
                
                if not user:
                    print(f"⚠️  Warning: User with account_id {owner_id} not found, skipping sandboxes")
                    continue
                
                # Insert default project
                result = db.execute(text("""
                    INSERT INTO projects (name, description, owner_account_id, is_default, status)
                    VALUES ('Default Project', 'Default project for existing sandboxes', :owner_id, TRUE, 'active')
                """), {'owner_id': owner_id})
                
                # Get the project_id of the newly created project
                result = db.execute(text("""
                    SELECT project_id, name 
                    FROM projects 
                    WHERE owner_account_id = :owner_id AND is_default = TRUE
                """), {'owner_id': owner_id})
                default_project = result.fetchone()
                
                if not default_project:
                    print(f"❌ Failed to create default project for user {user.username}")
                    continue
                
                print(f"✅ Created default project '{default_project.project_id}' for user {user.username}")
            
            # Assign sandboxes to the default project
            for sandbox in sandboxes:
                if default_project:
                    db.execute(text("""
                        UPDATE sandboxes 
                        SET project_id = :project_id 
                        WHERE id = :sandbox_id
                    """), {
                        'project_id': default_project.project_id,
                        'sandbox_id': sandbox.id
                    })
                    print(f"✅ Assigned sandbox '{sandbox.name}' to project '{default_project.name}'")
        
        db.commit()
        print(f"✅ Successfully migrated {len(orphaned_sandboxes)} sandboxes to projects.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error during migration: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Starting sandbox-to-project migration...")
    migrate_sandboxes_to_projects()
    print("✅ Migration completed successfully!") 