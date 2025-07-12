"""add templates tables

Revision ID: templates_v1
Revises: add_sandbox_tables
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'templates_v1'
down_revision = 'add_sandbox_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Create templates table
    op.create_table('templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('language', sa.String(100), nullable=False),
        sa.Column('cpu_requirements', sa.Float, nullable=False, default=1.0),
        sa.Column('memory_requirements', sa.Float, nullable=False, default=1.0),
        sa.Column('is_official', sa.Boolean, nullable=False, default=False),
        sa.Column('is_public', sa.Boolean, nullable=False, default=False),
        sa.Column('owner_id', sa.Integer, nullable=True),  # Changed to Integer to match User.id
        sa.Column('repository_url', sa.String(500), nullable=False),
        sa.Column('tags', mysql.JSON, nullable=True),
        sa.Column('stars', sa.Integer, nullable=False, default=0),
        sa.Column('downloads', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('name', 'owner_id', name='unique_template_name_per_owner')
    )

    # Create notifications table
    op.create_table('notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.Integer, nullable=False),  # Changed to Integer to match User.id
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('type', sa.String(50), nullable=False, default='info'),  # info, warning, error, success
        sa.Column('is_read', sa.Boolean, nullable=False, default=False),
        sa.Column('related_entity_type', sa.String(50), nullable=True),  # template, sandbox, api_key, etc.
        sa.Column('related_entity_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Create indexes
    op.create_index('idx_templates_owner', 'templates', ['owner_id'])
    op.create_index('idx_templates_official', 'templates', ['is_official'])
    op.create_index('idx_templates_public', 'templates', ['is_public'])
    op.create_index('idx_templates_category', 'templates', ['category'])
    op.create_index('idx_templates_language', 'templates', ['language'])
    op.create_index('idx_notifications_user', 'notifications', ['user_id'])
    op.create_index('idx_notifications_read', 'notifications', ['is_read'])
    op.create_index('idx_notifications_created', 'notifications', ['created_at'])


def downgrade():
    op.drop_index('idx_notifications_created', 'notifications')
    op.drop_index('idx_notifications_read', 'notifications')
    op.drop_index('idx_notifications_user', 'notifications')
    op.drop_index('idx_templates_language', 'templates')
    op.drop_index('idx_templates_category', 'templates')
    op.drop_index('idx_templates_public', 'templates')
    op.drop_index('idx_templates_official', 'templates')
    op.drop_index('idx_templates_owner', 'templates')
    op.drop_table('notifications')
    op.drop_table('templates') 