"""add payment review fields to registrations

Revision ID: e7f8a9b0c1d2
Revises: c5d4e6f7a8b9
Create Date: 2026-10-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, Sequence[str], None] = "c5d4e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("registrations", sa.Column("receipt_path", sa.String(), nullable=True))
    op.add_column(
        "registrations",
        sa.Column("payment_rejection_reason", sa.String(), nullable=True),
    )
    op.add_column("registrations", sa.Column("reviewed_by", sa.Integer(), nullable=True))
    op.add_column("registrations", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key(
        "fk_registrations_reviewed_by_users",
        "registrations",
        "users",
        ["reviewed_by"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_registrations_reviewed_by_users", "registrations", type_="foreignkey")
    op.drop_column("registrations", "reviewed_at")
    op.drop_column("registrations", "reviewed_by")
    op.drop_column("registrations", "payment_rejection_reason")
    op.drop_column("registrations", "receipt_path")