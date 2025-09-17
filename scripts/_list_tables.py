import sqlite3
p='course_platform.db'
conn=sqlite3.connect(p)
cur=conn.cursor()
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name")
rows=cur.fetchall()
print('Found', len(rows), 'tables')
for name, sql in rows:
    print('TABLE:', name)
    if sql:
        print(sql)
    print('---')
conn.close()
