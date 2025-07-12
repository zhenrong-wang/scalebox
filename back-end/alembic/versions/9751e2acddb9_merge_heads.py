"""merge heads

Revision ID: 9751e2acddb9
Revises: add_sandbox_metrics, remove_template_stars_downloads
Create Date: 2025-07-11 04:56:09.983429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9751e2acddb9'
down_revision: Union[str, Sequence[str], None] = ('add_sandbox_metrics', 'remove_template_stars_downloads')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
