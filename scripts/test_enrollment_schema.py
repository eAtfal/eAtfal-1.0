from app.schemas.enrollment import EnrollmentWithProgress
from datetime import datetime

def run():
    data = {
        'id': 1,
    'course_id': 10,
        'user_id': 2,
        'last_lesson_id': None,
        'enrolled_at': datetime.utcnow(),
        'course': {
            'id': 10,
            'title': 'Demo Course'
        },
        'total_lessons': 5,
        'completed_lessons': 2,
        'percent_complete': 40.0,
    }
    e = EnrollmentWithProgress(**data)
    print('OK', e.json())

if __name__ == '__main__':
    run()
