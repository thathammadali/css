"""add session meeting links

Revision ID: 8a7b6c5d4e3f
Revises: 4db654fb4b43
Create Date: 2026-10-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a7b6c5d4e3f"
down_revision: Union[str, Sequence[str], None] = "4db654fb4b43"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("meeting_links", sa.JSON(), nullable=True))
    op.execute("UPDATE sessions SET meeting_links = json_build_array(json_build_object('platform','other','label',NULL,'url',meeting_link,'public',false)) WHERE meeting_link IS NOT NULL")


def downgrade() -> None:
    op.drop_column("sessions", "meeting_links")
