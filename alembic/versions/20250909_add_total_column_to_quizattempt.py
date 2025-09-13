"""add total column to quizattempt

Revision ID: 20250909_add_total_column_to_quizattempt
Revises: 20250908_add_order_index_columns
Create Date: 2025-09-09 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250909_add_total_column_to_quizattempt'
down_revision = '20250908_add_order_index_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add 'total' column to quizattempt with default 0 to avoid NOT NULL issues
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('quizattempt')]
    if 'total' not in cols:
        op.add_column('quizattempt', sa.Column('total', sa.Integer(), nullable=False, server_default=sa.text('0')))
        # remove server_default to keep schema clean when supported
        # SQLite does not support altering columns; skip the alter on sqlite
        if bind.dialect.name != 'sqlite':
            with op.get_context().autocommit_block():
                op.alter_column('quizattempt', 'total', server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = [c['name'] for c in inspector.get_columns('quizattempt')]
    if 'total' in cols:
        op.drop_column('quizattempt', 'total')
