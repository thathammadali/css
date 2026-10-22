"""add capacity to sessions

Revision ID: c5d4e6f7a8b9
Revises: 998bedae11df
Create Date: 2026-10-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c5d4e6f7a8b9"
down_revision: Union[str, Sequence[str], None] = "998bedae11df"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("capacity", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("sessions", "capacity")