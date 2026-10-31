"""add fee_amount to sessions

Revision ID: d5e6f7a8b9cb
Revises: c4d5e6f7a8ba
Create Date: 2026-10-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9cb"
down_revision: Union[str, Sequence[str], None] = "c4d5e6f7a8ba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sessions",
        sa.Column("fee_amount", sa.Numeric(precision=10, scale=2), nullable=False, server_default="0"),
    )
    op.execute("UPDATE sessions SET fee_amount = events.fee_amount FROM events WHERE sessions.event_id = events.id")


def downgrade() -> None:
    op.drop_column("sessions", "fee_amount")
