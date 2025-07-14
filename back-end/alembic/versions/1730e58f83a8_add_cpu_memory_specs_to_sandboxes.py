"""add_cpu_memory_specs_to_sandboxes

Revision ID: 1730e58f83a8
Revises: c43f335d9ef6
Create Date: 2025-07-14 09:19:04.036989

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '1730e58f83a8'
down_revision: Union[str, Sequence[str], None] = 'c43f335d9ef6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Only add cpu_spec and memory_spec, and remove cpu_requirements and memory_requirements from sandboxes
    op.add_column('sandboxes', sa.Column('cpu_spec', sa.Float(), nullable=False, server_default='1.0'))
    op.add_column('sandboxes', sa.Column('memory_spec', sa.Float(), nullable=False, server_default='1.0'))
    op.drop_column('sandboxes', 'cpu_requirements')
    op.drop_column('sandboxes', 'memory_requirements')


def downgrade() -> None:
    """Downgrade schema."""
    # Revert the above changes
    op.add_column('sandboxes', sa.Column('cpu_requirements', sa.Float(), nullable=True))
    op.add_column('sandboxes', sa.Column('memory_requirements', sa.Float(), nullable=True))
    op.drop_column('sandboxes', 'cpu_spec')
    op.drop_column('sandboxes', 'memory_spec')
