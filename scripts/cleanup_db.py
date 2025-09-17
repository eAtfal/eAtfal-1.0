"""
Database cleanup script for development: backup DB, remove orphaned rows, dedupe lesson_completions,
and add a UNIQUE index on (user_id, lesson_id) to prevent future duplicates.

WARNING: Run in development only. The script makes backups before changes.
"""
import sqlite3
import shutil
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'course_platform.db')
BACKUP_DIR = os.path.join(BASE_DIR, 'db_backups')

os.makedirs(BACKUP_DIR, exist_ok=True)

def backup_db():
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    dest = os.path.join(BACKUP_DIR, f'course_platform.db.bak.{ts}')
    print(f'Backing up DB to {dest}')
    shutil.copy2(DB_PATH, dest)
    return dest


def run_sql(conn, sql, params=None):
    cur = conn.cursor()
    if params:
        cur.execute(sql, params)
    else:
        cur.execute(sql)
    return cur


def table_exists(conn, name):
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,))
    return cur.fetchone() is not None


def remove_orphans(conn):
    # Only run deletions for tables that exist in this DB schema
    # DB uses table names like 'lessoncompletion' and 'quizattempt' (no underscores)
    if table_exists(conn, 'lessoncompletion'):
        print('Removing orphaned lessoncompletion rows that reference missing lessons or users...')
        run_sql(conn, '''
            DELETE FROM lessoncompletion
            WHERE lesson_id NOT IN (SELECT id FROM lesson)
               OR user_id NOT IN (SELECT id FROM "user")
        ''')
    else:
        print('Table lessoncompletion not present, skipping')

    if table_exists(conn, 'enrollment'):
        print('Removing orphaned enrollments that reference missing courses or users...')
        run_sql(conn, '''
            DELETE FROM enrollment
            WHERE course_id NOT IN (SELECT id FROM course)
               OR user_id NOT IN (SELECT id FROM "user")
        ''')
    else:
        print('Table enrollment not present, skipping')

    if table_exists(conn, 'lesson'):
        print('Removing orphaned lessons that reference missing courses...')
        run_sql(conn, '''
            DELETE FROM lesson
            WHERE course_id NOT IN (SELECT id FROM course)
        ''')
    else:
        print('Table lesson not present, skipping')

    if table_exists(conn, 'quizattempt'):
        print('Removing orphaned quizattempt rows that reference missing quizzes or users...')
        run_sql(conn, '''
            DELETE FROM quizattempt
            WHERE quiz_id NOT IN (SELECT id FROM quiz)
               OR user_id NOT IN (SELECT id FROM "user")
        ''')
    else:
        print('Table quizattempt not present, skipping')

    if table_exists(conn, 'quiz'):
        print('Removing orphaned quiz rows that reference missing courses...')
        run_sql(conn, '''
            DELETE FROM quiz
            WHERE course_id NOT IN (SELECT id FROM course)
        ''')
    else:
        print('Table quiz not present, skipping')


def dedupe_lesson_completions(conn):
    print('Deduplicating lessoncompletion rows (keeping earliest id per user+lesson)...')
    if not table_exists(conn, 'lessoncompletion'):
        print('No lessoncompletion table found, skipping dedupe')
        return
    # Create a temp table of unique pairs with min id
    run_sql(conn, '''
        CREATE TABLE IF NOT EXISTS _lc_keep AS
        SELECT MIN(id) as keep_id
        FROM lessoncompletion
        GROUP BY user_id, lesson_id;
    ''')
    # Delete rows not in keep set
    run_sql(conn, '''
        DELETE FROM lessoncompletion
        WHERE id NOT IN (SELECT keep_id FROM _lc_keep)
    ''')
    run_sql(conn, 'DROP TABLE IF EXISTS _lc_keep')


def add_unique_index(conn):
    print('Adding UNIQUE index on lessoncompletion(user_id, lesson_id) if not exists...')
    cur = conn.cursor()
    # Check for existing index on lessoncompletion
    cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='lessoncompletion' AND sql LIKE '%user_id, lesson_id%';")
    if cur.fetchone():
        print('Unique index already exists, skipping')
        return
    run_sql(conn, 'CREATE UNIQUE INDEX idx_lessoncompletion_user_lesson ON lessoncompletion (user_id, lesson_id)')


def main():
    if not os.path.exists(DB_PATH):
        print(f'Database not found at {DB_PATH}')
        return
    bak = backup_db()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.isolation_level = None
        run_sql(conn, 'BEGIN')
        remove_orphans(conn)
        dedupe_lesson_completions(conn)
        add_unique_index(conn)
        run_sql(conn, 'COMMIT')
        print('Cleanup completed successfully.')
    except Exception as e:
        run_sql(conn, 'ROLLBACK')
        print('Error during cleanup:', e)
        print('Restoring backup...')
        conn.close()
        shutil.copy2(bak, DB_PATH)
        print('Restored backup')
        return
    finally:
        conn.close()

if __name__ == '__main__':
    main()
