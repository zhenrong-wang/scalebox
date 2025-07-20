"""separate_account_and_user_entities

Revision ID: 55e271b8f232
Revises: 7dd8ebd2a37b
Create Date: 2025-07-18 13:14:21.116915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = '55e271b8f232'
down_revision: Union[str, Sequence[str], None] = '7dd8ebd2a37b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Step 1: Create accounts table
    op.create_table('accounts',
        sa.Column('account_id', sa.String(length=12), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_users', sa.Integer(), nullable=False, default=1),
        sa.Column('max_projects', sa.Integer(), nullable=False, default=10),
        sa.Column('plan_type', sa.String(length=50), nullable=False, default='free'),
        sa.Column('status', sa.String(length=50), nullable=False, default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('account_id')
    )
    
    # Step 2: Add user_id and is_root_user columns to users table
    op.add_column('users', sa.Column('user_id', sa.String(length=12), nullable=True))
    op.add_column('users', sa.Column('is_root_user', sa.Boolean(), nullable=False, default=False))
    
    # Step 3: Create indexes for the new columns
    op.create_index('idx_user_user_id', 'users', ['user_id'], unique=True)
    op.create_index('idx_user_root_user', 'users', ['is_root_user'], unique=False)
    
    # Step 4: Add user_id column to api_keys table
    op.add_column('api_keys', sa.Column('user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_api_key_user_id', 'api_keys', ['user_id'], unique=False)
    
    # Step 5: Add user_id column to billing_records table
    op.add_column('billing_records', sa.Column('user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_billing_user_id', 'billing_records', ['user_id'], unique=False)
    
    # Step 6: Add user_id column to notifications table
    op.add_column('notifications', sa.Column('user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_notification_user_id', 'notifications', ['user_id'], unique=False)
    
    # Step 7: Add owner_user_id column to projects table
    op.add_column('projects', sa.Column('owner_user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_project_owner_user', 'projects', ['owner_user_id'], unique=False)
    
    # Step 8: Add user_id column to sandbox_usage table
    op.add_column('sandbox_usage', sa.Column('user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_usage_user_id', 'sandbox_usage', ['user_id'], unique=False)
    
    # Step 9: Add owner_user_id column to sandboxes table
    op.add_column('sandboxes', sa.Column('owner_user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_sandbox_owner_user', 'sandboxes', ['owner_user_id'], unique=False)
    
    # Step 10: Add owner_user_id column to templates table
    op.add_column('templates', sa.Column('owner_user_id', sa.String(length=12), nullable=True))
    op.create_index('idx_template_owner_user', 'templates', ['owner_user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop all new columns and indexes in reverse order
    op.drop_index('idx_template_owner_user', table_name='templates')
    op.drop_column('templates', 'owner_user_id')
    
    op.drop_index('idx_sandbox_owner_user', table_name='sandboxes')
    op.drop_column('sandboxes', 'owner_user_id')
    
    op.drop_index('idx_usage_user_id', table_name='sandbox_usage')
    op.drop_column('sandbox_usage', 'user_id')
    
    op.drop_index('idx_project_owner_user', table_name='projects')
    op.drop_column('projects', 'owner_user_id')
    
    op.drop_index('idx_notification_user_id', table_name='notifications')
    op.drop_column('notifications', 'user_id')
    
    op.drop_index('idx_billing_user_id', table_name='billing_records')
    op.drop_column('billing_records', 'user_id')
    
    op.drop_index('idx_api_key_user_id', table_name='api_keys')
    op.drop_column('api_keys', 'user_id')
    
    op.drop_index('idx_user_root_user', table_name='users')
    op.drop_index('idx_user_user_id', table_name='users')
    op.drop_column('users', 'is_root_user')
    op.drop_column('users', 'user_id')
    
    op.drop_table('accounts') 