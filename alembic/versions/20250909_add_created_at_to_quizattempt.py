"""add created_at column to quizattempt

Revision ID: 20250909_add_created_at_to_quizattempt
Revises: 20250909_add_total_column_to_quizattempt
Create Date: 2025-09-09 00:10:00.000000
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '20250909_add_created_at_to_quizattempt'
down_revision = '20250909_add_total_column_to_quizattempt'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('quizattempt')]
    if 'created_at' not in cols:
        # sqlite doesn't support timezone-aware functions; use text default
        op.add_column('quizattempt', sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text("'1970-01-01 00:00:00'")))
        # Optionally set created_at for existing rows to current timestamp
        # Update existing rows to a sensible default (now)
        now = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        op.execute(f"UPDATE quizattempt SET created_at = '{now}' WHERE created_at IS NULL OR created_at = ''")
        # remove server_default to keep schema clean when supported
        # SQLite does not support altering columns; skip the alter on sqlite
        if bind.dialect.name != 'sqlite':
            with op.get_context().autocommit_block():
                op.alter_column('quizattempt', 'created_at', server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('quizattempt')]
    if 'created_at' in cols:
        op.drop_column('quizattempt', 'created_at')
