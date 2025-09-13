"""DEPRECATED NO-OP migration

This migration was a duplicate/auto-generated script. It has been converted to a no-op
to avoid destructive schema changes. The canonical migration for quizzes is
`20250822_add_normalized_quiz_tables.py`.

Revision ID: 43f73004215c
Revises: 20250822_add_normalized_quiz_tables
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '43f73004215c'
down_revision = '20250822_add_normalized_quiz_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # intentionally left blank (no-op)
    pass


def downgrade() -> None:
    # intentionally left blank (no-op)
    pass
