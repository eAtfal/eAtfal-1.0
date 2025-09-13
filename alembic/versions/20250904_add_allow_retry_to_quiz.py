
"""DEPRECATED NO-OP migration

This migration was created during troubleshooting and is now converted to a no-op.
The canonical migration for quizzes is `20250822_add_normalized_quiz_tables.py`.

Revision ID: 20250904_add_allow_retry_to_quiz
Revises: 43f73004215c
"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '20250904_add_allow_retry_to_quiz'
down_revision = '43f73004215c'
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
