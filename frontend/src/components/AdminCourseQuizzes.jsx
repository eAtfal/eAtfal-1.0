import React from 'react'
import AdminQuizEditor from './AdminQuizEditor'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import quizAPI from '../api/quiz'


function AdminCourseQuizzes() {
  const { courseId } = useParams()
  const queryClient = useQueryClient()

  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ['admin-course-quizzes', courseId],
    queryFn: () => quizAPI.getCourseQuizzes(courseId).then(r => r.data),
    enabled: !!courseId,
  })

  const handleCreated = (data) => {
    // invalidate/refetch the quizzes list so the newly created quiz appears
    queryClient.invalidateQueries(['admin-course-quizzes', courseId])
  }
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <h2 className="text-xl font-bold mb-4">Manage Quizzes</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Existing Quizzes</h3>
        {isLoading && <div>Loading quizzes…</div>}
        {error && <div className="text-red-600">Error loading quizzes</div>}
        {!isLoading && !error && (
          <div className="space-y-2">
            {(quizzes || []).length === 0 && <div className="text-sm text-slate-500">No quizzes yet for this course.</div>}
            {(quizzes || []).map(q => (
              <div key={q.id} className="p-3 rounded-md border flex items-center justify-between">
                <div>
                  <div className="font-medium">{q.title}</div>
                  <div className="text-sm text-slate-500">Questions: {q.questions?.length ?? 0}</div>
                </div>
                <div>
                  <a href={`/admin/courses/${courseId}/quizzes/${q.id}`} className="text-sm text-sky-600">Manage</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminQuizEditor courseId={courseId} onSuccess={handleCreated} />
    </div>
  )
}

export default AdminCourseQuizzes
