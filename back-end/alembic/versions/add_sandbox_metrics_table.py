"""add_sandbox_metrics_table

Revision ID: add_sandbox_metrics
Revises: templates_v1
Create Date: 2025-07-11 03:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'add_sandbox_metrics'
down_revision: Union[str, Sequence[str], None] = 'templates_v1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create sandbox_metrics table
    op.create_table('sandbox_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sandbox_id', sa.String(length=36), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('cpu_usage', sa.Float(), nullable=False),
        sa.Column('memory_usage', sa.Float(), nullable=False),
        sa.Column('storage_usage', sa.Float(), nullable=False),
        sa.Column('bandwidth_usage', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['sandbox_id'], ['sandboxes.id'], name='fk_sandbox_metrics_sandbox_id'),
        sa.PrimaryKeyConstraint('id'),
        mysql_collate='utf8mb4_general_ci',
        mysql_default_charset='utf8mb4',
        mysql_engine='InnoDB'
    )
    
    # Create indexes
    op.create_index('ix_sandbox_metrics_id', 'sandbox_metrics', ['id'], unique=False)
    op.create_index('ix_sandbox_metrics_sandbox_id', 'sandbox_metrics', ['sandbox_id'], unique=False)
    op.create_index('ix_sandbox_metrics_timestamp', 'sandbox_metrics', ['timestamp'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_sandbox_metrics_timestamp', table_name='sandbox_metrics')
    op.drop_index('ix_sandbox_metrics_sandbox_id', table_name='sandbox_metrics')
    op.drop_index('ix_sandbox_metrics_id', table_name='sandbox_metrics')
    op.drop_table('sandbox_metrics') 