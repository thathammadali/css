"""add certificate_settings to events

Revision ID: e6f7a8b9cbdc
Revises: d5e6f7a8b9cb
Create Date: 2026-11-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e6f7a8b9cbdc"
down_revision: Union[str, Sequence[str], None] = "d5e6f7a8b9cb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("certificate_settings", sa.JSON(none_as_null=True), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "certificate_settings")
