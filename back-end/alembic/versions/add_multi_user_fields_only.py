"""add multi user fields only

Revision ID: add_multi_user_fields_only
Revises: 55e271b8f232
Create Date: 2025-07-20 06:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_multi_user_fields_only'
down_revision = '55e271b8f232'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to users table
    op.add_column('users', sa.Column('dedicated_signin_url', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('is_first_time_login', sa.Boolean(), nullable=False, server_default='1'))
    op.add_column('users', sa.Column('description', sa.Text(), nullable=True))
    
    # Add unique index for dedicated_signin_url
    op.create_index('ix_users_dedicated_signin_url', 'users', ['dedicated_signin_url'], unique=True)


def downgrade():
    # Remove unique index
    op.drop_index('ix_users_dedicated_signin_url', table_name='users')
    
    # Remove columns
    op.drop_column('users', 'description')
    op.drop_column('users', 'is_first_time_login')
    op.drop_column('users', 'dedicated_signin_url') 