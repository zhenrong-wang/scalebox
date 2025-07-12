"""remove template stars and downloads columns

Revision ID: remove_template_stars_downloads
Revises: templates_v1
Create Date: 2024-01-15 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_template_stars_downloads'
down_revision = 'templates_v1'
branch_labels = None
depends_on = None


def upgrade():
    # Remove stars and downloads columns from templates table
    op.drop_column('templates', 'stars')
    op.drop_column('templates', 'downloads')


def downgrade():
    # Add back stars and downloads columns
    op.add_column('templates', sa.Column('stars', sa.Integer, nullable=False, default=0))
    op.add_column('templates', sa.Column('downloads', sa.Integer, nullable=False, default=0)) 