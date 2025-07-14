"""update_templates_to_use_cpu_memory_specs

Revision ID: 88da0e388dbe
Revises: 1730e58f83a8
Create Date: 2025-07-14 09:35:12.123456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '88da0e388dbe'
down_revision: Union[str, Sequence[str], None] = '1730e58f83a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Only update templates table to use cpu_spec and memory_spec
    op.add_column('templates', sa.Column('cpu_spec', sa.Float(), nullable=False, server_default='1.0'))
    op.add_column('templates', sa.Column('memory_spec', sa.Float(), nullable=False, server_default='1.0'))
    op.drop_column('templates', 'cpu_requirements')
    op.drop_column('templates', 'memory_requirements')


def downgrade() -> None:
    """Downgrade schema."""
    # Revert the above changes
    op.add_column('templates', sa.Column('cpu_requirements', sa.Float(), nullable=True))
    op.add_column('templates', sa.Column('memory_requirements', sa.Float(), nullable=True))
    op.drop_column('templates', 'cpu_spec')
    op.drop_column('templates', 'memory_spec')
