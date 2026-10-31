"""move payment details from events to sessions

Revision ID: c4d5e6f7a8ba
Revises: b3c4d5e6f7a8
Create Date: 2026-10-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8ba"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("payment_method", sa.String(), nullable=True))
    op.add_column("sessions", sa.Column("account_title", sa.String(), nullable=True))
    op.add_column("sessions", sa.Column("account_number", sa.String(length=34), nullable=True))
    op.add_column("sessions", sa.Column("payment_instructions", sa.Text(), nullable=True))
    op.drop_column("events", "payment_instructions")
    op.drop_column("events", "account_number")
    op.drop_column("events", "account_title")
    op.drop_column("events", "payment_method")


def downgrade() -> None:
    op.add_column("events", sa.Column("payment_method", sa.String(), nullable=True))
    op.add_column("events", sa.Column("account_title", sa.String(), nullable=True))
    op.add_column("events", sa.Column("account_number", sa.String(length=34), nullable=True))
    op.add_column("events", sa.Column("payment_instructions", sa.Text(), nullable=True))
    op.drop_column("sessions", "payment_instructions")
    op.drop_column("sessions", "account_number")
    op.drop_column("sessions", "account_title")
    op.drop_column("sessions", "payment_method")
