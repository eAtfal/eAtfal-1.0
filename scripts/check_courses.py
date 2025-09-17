import sqlite3
p='course_platform.db'
conn=sqlite3.connect(p)
cur=conn.cursor()
print('Courses and counts:')
cur.execute('''
SELECT c.id, c.title, c.is_published,
  COALESCE(e.enroll_count,0) as enrollments,
  COALESCE(l.lesson_count,0) as lessons,
  COALESCE(q.quiz_count,0) as quizzes
FROM course c
LEFT JOIN (SELECT course_id, COUNT(*) as enroll_count FROM enrollment GROUP BY course_id) e ON e.course_id = c.id
LEFT JOIN (SELECT course_id, COUNT(*) as lesson_count FROM lesson GROUP BY course_id) l ON l.course_id = c.id
LEFT JOIN (SELECT course_id, COUNT(*) as quiz_count FROM quiz GROUP BY course_id) q ON q.course_id = c.id
ORDER BY c.id
''')
rows = cur.fetchall()
for r in rows:
    print(r)

# Show enrollments pointing to missing courses
print('\nEnrollments referencing missing course ids:')
cur.execute('''
SELECT DISTINCT course_id FROM enrollment WHERE course_id NOT IN (SELECT id FROM course)
''')
print(cur.fetchall())

# Show lessons referencing missing courses
print('\nLessons referencing missing course ids:')
cur.execute('''
SELECT DISTINCT course_id FROM lesson WHERE course_id NOT IN (SELECT id FROM course)
''')
print(cur.fetchall())

conn.close()
