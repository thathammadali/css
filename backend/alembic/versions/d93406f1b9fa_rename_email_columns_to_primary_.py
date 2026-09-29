"""rename email columns to primary secondary

Revision ID: d93406f1b9fa
Revises: 11a1d53abbd8
Create Date: 2026-09-29 14:04:27.516581

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd93406f1b9fa'
down_revision: Union[str, Sequence[str], None] = '11a1d53abbd8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('users', 'university_email', new_column_name='primary_email')
    op.alter_column('users', 'personal_email', new_column_name='secondary_email')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('users', 'primary_email', new_column_name='university_email')
    op.alter_column('users', 'secondary_email', new_column_name='personal_email')
