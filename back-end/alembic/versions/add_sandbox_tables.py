"""add_sandbox_tables

Revision ID: add_sandbox_tables
Revises: cd6417fa58ca
Create Date: 2025-07-10 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_sandbox_tables'
down_revision: Union[str, Sequence[str], None] = 'cd6417fa58ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create sandboxes table
    op.create_table('sandboxes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('framework', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('region', sa.String(length=20), nullable=False),
        sa.Column('visibility', sa.String(length=20), nullable=False),
        sa.Column('project_id', sa.String(length=36), nullable=True),
        sa.Column('cpu_usage', sa.Float(), nullable=True),
        sa.Column('memory_usage', sa.Float(), nullable=True),
        sa.Column('storage_usage', sa.Float(), nullable=True),
        sa.Column('bandwidth_usage', sa.Float(), nullable=True),
        sa.Column('hourly_rate', sa.Float(), nullable=True),
        sa.Column('total_cost', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.account_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for sandboxes table
    op.create_index('idx_sandboxes_created_at', 'sandboxes', ['created_at'], unique=False)
    op.create_index('idx_sandboxes_framework_status', 'sandboxes', ['framework', 'status'], unique=False)
    op.create_index('idx_sandboxes_user_status', 'sandboxes', ['user_id', 'status'], unique=False)
    op.create_index('ix_sandboxes_name', 'sandboxes', ['name'], unique=False)
    op.create_index('ix_sandboxes_framework', 'sandboxes', ['framework'], unique=False)
    op.create_index('ix_sandboxes_status', 'sandboxes', ['status'], unique=False)
    op.create_index('ix_sandboxes_user_id', 'sandboxes', ['user_id'], unique=False)
    op.create_index('ix_sandboxes_region', 'sandboxes', ['region'], unique=False)
    op.create_index('ix_sandboxes_visibility', 'sandboxes', ['visibility'], unique=False)
    op.create_index('ix_sandboxes_project_id', 'sandboxes', ['project_id'], unique=False)
    
    # Create sandbox_usage table
    op.create_table('sandbox_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sandbox_id', sa.String(length=36), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('cpu_usage', sa.Float(), nullable=False),
        sa.Column('memory_usage', sa.Float(), nullable=False),
        sa.Column('storage_usage', sa.Float(), nullable=False),
        sa.Column('bandwidth_usage', sa.Float(), nullable=False),
        sa.Column('cost_increment', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['sandbox_id'], ['sandboxes.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for sandbox_usage table
    op.create_index('ix_sandbox_usage_id', 'sandbox_usage', ['id'], unique=False)
    op.create_index('ix_sandbox_usage_sandbox_id', 'sandbox_usage', ['sandbox_id'], unique=False)
    op.create_index('ix_sandbox_usage_timestamp', 'sandbox_usage', ['timestamp'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop sandbox_usage table and indexes
    op.drop_index('ix_sandbox_usage_timestamp', table_name='sandbox_usage')
    op.drop_index('ix_sandbox_usage_sandbox_id', table_name='sandbox_usage')
    op.drop_index('ix_sandbox_usage_id', table_name='sandbox_usage')
    op.drop_table('sandbox_usage')
    
    # Drop sandboxes table and indexes
    op.drop_index('ix_sandboxes_project_id', table_name='sandboxes')
    op.drop_index('ix_sandboxes_visibility', table_name='sandboxes')
    op.drop_index('ix_sandboxes_region', table_name='sandboxes')
    op.drop_index('ix_sandboxes_user_id', table_name='sandboxes')
    op.drop_index('ix_sandboxes_status', table_name='sandboxes')
    op.drop_index('ix_sandboxes_framework', table_name='sandboxes')
    op.drop_index('ix_sandboxes_name', table_name='sandboxes')
    op.drop_index('idx_sandboxes_user_status', table_name='sandboxes')
    op.drop_index('idx_sandboxes_framework_status', table_name='sandboxes')
    op.drop_index('idx_sandboxes_created_at', table_name='sandboxes')
    op.drop_table('sandboxes') 