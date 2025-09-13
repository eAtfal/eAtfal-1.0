"""add normalized quiz tables

Revision ID: 20250822_add_normalized_quiz_tables
Revises: 11b67aeda7c9
Create Date: 2025-08-22 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250822_add_normalized_quiz_tables'
down_revision = '11b67aeda7c9'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # Detect whether the 'quiz' table already exists
    existing_tables = [r[0] for r in bind.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()]

    def table_exists(name: str) -> bool:
        return name in existing_tables

    # If quiz table exists, add missing columns only (safe for existing DBs)
    if table_exists('quiz'):
        existing_cols = [r[1] for r in bind.execute(sa.text("PRAGMA table_info('quiz')")).fetchall()]

        def add_column_if_missing(col_name, col_type):
            if col_name not in existing_cols:
                op.add_column('quiz', col_type)

        add_column_if_missing('description', sa.Column('description', sa.Text(), nullable=True))
        add_column_if_missing('duration_seconds', sa.Column('duration_seconds', sa.Integer(), nullable=True))
        add_column_if_missing('passing_score', sa.Column('passing_score', sa.Float(), nullable=False, server_default='0'))
        add_column_if_missing('attempts_allowed', sa.Column('attempts_allowed', sa.Integer(), nullable=False, server_default='0'))
        add_column_if_missing('allow_review', sa.Column('allow_review', sa.Boolean(), nullable=False, server_default=sa.text('1')))
        add_column_if_missing('shuffle_questions', sa.Column('shuffle_questions', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        add_column_if_missing('shuffle_answers', sa.Column('shuffle_answers', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        add_column_if_missing('published', sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        add_column_if_missing('created_at', sa.Column('created_at', sa.DateTime(), nullable=False))
        add_column_if_missing('updated_at', sa.Column('updated_at', sa.DateTime(), nullable=False))

        # create supporting tables if missing
        if not table_exists('question'):
            op.create_table(
                'question',
                sa.Column('id', sa.Integer(), primary_key=True),
                sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quiz.id'), nullable=False),
                sa.Column('text', sa.Text(), nullable=False),
                sa.Column('points', sa.Float(), nullable=False, server_default='1'),
                sa.Column('multiple_correct', sa.Boolean(), nullable=False, server_default=sa.text('0')),
                sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
            )

        if not table_exists('option'):
            op.create_table(
                'option',
                sa.Column('id', sa.Integer(), primary_key=True),
                sa.Column('question_id', sa.Integer(), sa.ForeignKey('question.id'), nullable=False),
                sa.Column('text', sa.Text(), nullable=False),
                sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('0')),
                sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
            )

        if not table_exists('quizattempt'):
            op.create_table(
                'quizattempt',
                sa.Column('id', sa.Integer(), primary_key=True),
                sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quiz.id'), nullable=False),
                sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
                sa.Column('started_at', sa.DateTime(), nullable=False),
                sa.Column('finished_at', sa.DateTime(), nullable=True),
                sa.Column('score', sa.Float(), nullable=True),
                sa.Column('passed', sa.Boolean(), nullable=True),
                sa.Column('status', sa.String(length=50), nullable=False, server_default='in_progress'),
            )

        if not table_exists('attemptanswer'):
            op.create_table(
                'attemptanswer',
                sa.Column('id', sa.Integer(), primary_key=True),
                sa.Column('attempt_id', sa.Integer(), sa.ForeignKey('quizattempt.id'), nullable=False),
                sa.Column('question_id', sa.Integer(), sa.ForeignKey('question.id'), nullable=False),
                sa.Column('selected_option_ids', sa.JSON(), nullable=False),
                sa.Column('is_correct', sa.Boolean(), nullable=True),
            )
    else:
        # No pre-existing quiz table — create the normalized tables as originally intended
        op.create_table(
            'quiz',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('course_id', sa.Integer(), sa.ForeignKey('course.id'), nullable=False),
            sa.Column('lesson_id', sa.Integer(), sa.ForeignKey('lesson.id'), nullable=True, unique=True),
            sa.Column('title', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('duration_seconds', sa.Integer(), nullable=True),
            sa.Column('passing_score', sa.Float(), nullable=False, server_default='0'),
            sa.Column('attempts_allowed', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('allow_review', sa.Boolean(), nullable=False, server_default=sa.text('1')),
            sa.Column('shuffle_questions', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('shuffle_answers', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('published', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
        )

        op.create_table(
            'question',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quiz.id'), nullable=False),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('points', sa.Float(), nullable=False, server_default='1'),
            sa.Column('multiple_correct', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        )

        op.create_table(
            'option',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('question_id', sa.Integer(), sa.ForeignKey('question.id'), nullable=False),
            sa.Column('text', sa.Text(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), nullable=False, server_default=sa.text('0')),
            sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        )

        op.create_table(
            'quizattempt',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('quiz_id', sa.Integer(), sa.ForeignKey('quiz.id'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=False),
            sa.Column('started_at', sa.DateTime(), nullable=False),
            sa.Column('finished_at', sa.DateTime(), nullable=True),
            sa.Column('score', sa.Float(), nullable=True),
            sa.Column('passed', sa.Boolean(), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=False, server_default='in_progress'),
        )

        op.create_table(
            'attemptanswer',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('attempt_id', sa.Integer(), sa.ForeignKey('quizattempt.id'), nullable=False),
            sa.Column('question_id', sa.Integer(), sa.ForeignKey('question.id'), nullable=False),
            sa.Column('selected_option_ids', sa.JSON(), nullable=False),
            sa.Column('is_correct', sa.Boolean(), nullable=True),
        )


def downgrade():
    op.drop_table('attemptanswer')
    op.drop_table('quizattempt')
    op.drop_table('option')
    op.drop_table('question')
    op.drop_table('quiz')