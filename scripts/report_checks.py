import sqlite3
from pprint import pprint

DB='course_platform.db'
conn=sqlite3.connect(DB)
cur=conn.cursor()

print('=== Enrollments (published courses) ===')
cur.execute('''
SELECT c.id, c.title, COUNT(e.id) as enrollments
FROM course c
LEFT JOIN enrollment e ON e.course_id = c.id
WHERE c.is_published = 1
GROUP BY c.id
ORDER BY c.id
''')
for r in cur.fetchall():
    print(r)

print('\n=== Completion (published courses) ===')
# total lessons per course
cur.execute('SELECT id, title, (SELECT COUNT(*) FROM lesson l WHERE l.course_id=c.id) as total_lessons FROM course c WHERE c.is_published=1')
courses = cur.fetchall()
for cid, title, total in courses:
    # count distinct completions by enrolled users
    cur.execute('''
    SELECT COUNT(DISTINCT lc.user_id || '-' || lc.lesson_id) FROM lessoncompletion lc
    JOIN lesson l ON l.id = lc.lesson_id
    JOIN enrollment en ON en.course_id = l.course_id AND en.user_id = lc.user_id
    WHERE l.course_id = ?
    ''', (cid,))
    completed = cur.fetchone()[0]
    # compute percent as completed / (total_lessons * enrollments)
    cur.execute('SELECT COUNT(*) FROM enrollment WHERE course_id = ?', (cid,))
    enrollments = cur.fetchone()[0]
    if total > 0 and enrollments > 0:
        pct = round((completed / (total * enrollments)) * 100, 2)
    else:
        pct = 0.0
    print((cid, title, total, completed, pct, enrollments))

print('\n=== Dropoffs (published courses lessons lowest completions) ===')
cur.execute('''
SELECT l.id, l.course_id, c.title, l.title, COUNT(DISTINCT lc.user_id) as completions
FROM lesson l
JOIN course c ON c.id = l.course_id
LEFT JOIN lessoncompletion lc ON lc.lesson_id = l.id
LEFT JOIN enrollment en ON en.course_id = l.course_id AND en.user_id = lc.user_id
WHERE c.is_published=1
GROUP BY l.id
ORDER BY l.course_id, completions ASC
''')
rows=cur.fetchall()
from collections import defaultdict
courses=defaultdict(list)
for r in rows:
    lid, cid, ctitle, ltitle, comps = r
    courses[cid].append((lid, ltitle, comps))
for cid, lessons in courses.items():
    print('Course', cid, lessons[0][1] if lessons else 'unknown')
    min_c = min(l[2] for l in lessons)
    for l in lessons:
        if l[2]==min_c:
            print('  ', l)

print('\n=== Avg Time (lesson and course weighted) ===')
cur.execute('SELECT l.id, l.title, l.course_id, l.duration_seconds FROM lesson l JOIN course c ON c.id = l.course_id WHERE c.is_published=1')
lessons = cur.fetchall()
# comp counts per lesson
cur.execute('''
SELECT l.id as lesson_id, COUNT(DISTINCT lc.user_id) as comps
FROM lesson l
JOIN course c ON c.id = l.course_id
LEFT JOIN lessoncompletion lc ON lc.lesson_id = l.id
LEFT JOIN enrollment en ON en.course_id = l.course_id AND en.user_id = lc.user_id
WHERE c.is_published=1
GROUP BY l.id
''')
comp_map = {r[0]: r[1] for r in cur.fetchall()}
from collections import defaultdict
course_acc=defaultdict(lambda: {'dur_sum':0.0, 'weight':0, 'title':''})
for l in lessons:
    lid, ltitle, cid, dur = l
    dur = dur or 0
    comps = comp_map.get(lid, 0)
    if dur>0 and comps>0:
        course_acc[cid]['dur_sum'] += dur*comps
        course_acc[cid]['weight'] += comps
        course_acc[cid]['title'] = course_acc[cid]['title'] or ''
    print(('lesson', lid, ltitle, cid, dur, comps))
for cid, acc in course_acc.items():
    avg = acc['dur_sum']/acc['weight'] if acc['weight']>0 else 0
    print(('course', cid, round(avg,2)))

print('\n=== Quiz performance (published course quizzes) ===')
cur.execute('SELECT q.id, q.course_id, q.title FROM quiz q JOIN course c ON c.id = q.course_id WHERE c.is_published=1')
for qid, cid, qtitle in cur.fetchall():
    cur.execute('SELECT COUNT(*) FROM quizattempt WHERE quiz_id=? AND total>0', (qid,))
    attempts = cur.fetchone()[0]
    cur.execute('SELECT AVG(CAST(score AS FLOAT)/NULLIF(total,0)) FROM quizattempt WHERE quiz_id=? AND total>0', (qid,))
    avg = cur.fetchone()[0] or 0
    cur.execute('SELECT COUNT(*) FROM quizattempt WHERE quiz_id=? AND total>0 AND (CAST(score AS FLOAT)/total)>=0.5', (qid,))
    passes = cur.fetchone()[0]
    pass_rate = round((passes/(attempts or 1))*100,2) if attempts>0 else 0
    print((qid, cid, qtitle, attempts, round(avg*100,2), pass_rate))

conn.close()
