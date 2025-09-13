"""add allow_retry column to quiz

Revision ID: 20250905_add_allow_retry_column
Revises: 20250904_add_allow_retry_to_quiz
Create Date: 2025-09-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250905_add_allow_retry_column'
down_revision = '20250904_add_allow_retry_to_quiz'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_cols = [r[1] for r in bind.execute(sa.text("PRAGMA table_info('quiz')")).fetchall()]

    if 'allow_retry' not in existing_cols:
        # SQLite supports adding a nullable column with a server default safely.
        op.add_column('quiz', sa.Column('allow_retry', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    # Removing columns in SQLite can be destructive; keep downgrade noop to avoid data loss.
    pass
