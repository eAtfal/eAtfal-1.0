"""add order_index columns to question and option

Revision ID: 20250908_add_order_index_columns
Revises: 20250905_add_allow_retry_column
Create Date: 2025-09-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250908_add_order_index_columns'
down_revision = '20250905_add_allow_retry_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    # add order_index to question if missing
    existing = [r[1] for r in bind.execute(sa.text("PRAGMA table_info('question')")).fetchall()]
    # older migrations use column name 'order' for ordering; add that if missing
    if 'order' not in existing:
        op.add_column('question', sa.Column('order', sa.Integer(), nullable=False, server_default='0'))

    # add order_index to option if missing
    existing_opt = [r[1] for r in bind.execute(sa.text("PRAGMA table_info('option')")).fetchall()]
    if 'order' not in existing_opt:
        op.add_column('option', sa.Column('order', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    # Do not remove columns on downgrade to avoid accidental data loss in SQLite
    pass
