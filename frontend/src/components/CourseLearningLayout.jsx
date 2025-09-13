import { useState, useEffect } from 'react'
import { BadgeCheck, Play } from 'lucide-react'
import { calculateProgress } from '../utils/format'
import { useParams, Link, useNavigate, Outlet } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { coursesAPI, lessonsAPI } from '../api'
import quizAPI from '../api/quiz'

function CourseLearningLayout() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesAPI.get(courseId).then((res) => res.data)
  })

  const {
    data: lessons,
    isLoading: lessonsLoading,
    error: lessonsError,
  } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => lessonsAPI.getAll(courseId).then((res) => res.data)
  })

  const {
    data: quizzes,
    isLoading: quizzesLoading,
    error: quizzesError,
  } = useQuery({
    queryKey: ['quizzes', courseId],
    queryFn: () => quizAPI.getCourseQuizzes(courseId).then(res => res.data),
    enabled: !!courseId,
  })

  const toggleSidebar = () => setSidebarOpen(v => !v)

  const queryClient = useQueryClient()

  useEffect(() => {
    const onAuthChanged = () => {
      if (!courseId) return
      // Refresh course/lessons/quizzes when auth or enrollment may have changed
      queryClient.invalidateQueries(['course', courseId])
      queryClient.invalidateQueries(['lessons', courseId])
      queryClient.invalidateQueries(['quizzes', courseId])
    }

    window.addEventListener('authChanged', onAuthChanged)
    window.addEventListener('storage', onAuthChanged)
    return () => {
      window.removeEventListener('authChanged', onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
    }
  }, [queryClient, courseId])

  if (courseLoading || lessonsLoading || quizzesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh] py-6">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full" aria-hidden="true" />
      </div>
    )
  }

  if (courseError || lessonsError || quizzesError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">Error loading course content</div>
      </div>
    )
  }

  const progressPercent = calculateProgress(
    Number(course?.completed_lessons ?? 0),
    Number(course?.total_lessons ?? 0),
    Number(course?.passed_quizzes ?? 0),
    Number(course?.total_quizzes ?? 0)
  )

  return (
    <div className="min-h-screen flex">

      {/* Sidebar overlay */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-50 border-r z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!sidebarOpen}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h6 className="font-medium">Course Progress</h6>
            <span className="text-sm text-gray-700">{progressPercent}%</span>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-green-400" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="space-y-1">
            {(lessons || []).length === 0 && (quizzes || []).length === 0 ? (
              <div className="text-sm text-gray-500">No lessons or quizzes available.</div>
            ) : (
              <>
                {(lessons || []).map((lesson, index) => (
                  <Link
                    key={`lesson-${lesson.id}`}
                    to={`/courses/${courseId}/learn/${lesson.id}`}
                    className={`block p-3 rounded-md hover:bg-gray-100 ${lesson.completed ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-inset ${lesson.completed ? 'bg-emerald-100 text-emerald-600 ring-emerald-200' : 'bg-sky-100 text-sky-600 ring-sky-200'}`}
                        aria-label={lesson.completed ? 'Completed' : 'Not completed'}
                        title={lesson.completed ? 'Completed' : 'Not completed'}
                      >
                        {lesson.completed ? <BadgeCheck className="h-4 w-4" /> : <Play className="h-3 w-3" />}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{lesson.title ?? 'Untitled lesson'}</div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                          <span>{(lesson.duration ?? 0)} min</span>
                          {lesson.has_quiz && <span className="text-xs px-2 py-0.5 bg-yellow-100 rounded">Quiz</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Quizzes list */}
                {(quizzes || []).map((quiz) => (
                  <Link
                    key={`quiz-${quiz.id}`}
                    to={`/courses/${courseId}/learn/quiz/${quiz.id}`}
                    className={`block p-3 rounded-md hover:bg-gray-100 bg-yellow-50`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center text-yellow-600">Q</div>
                      <div className="flex-1">
                        <div className="font-medium">{quiz.title ?? 'Quiz'}</div>
                        <div className="text-sm text-gray-500 mt-1">{quiz.questions?.length ?? 0} questions</div>
                      </div>
                      <div className="text-sm text-gray-600">{quiz.allow_retry ? 'Retry' : 'One-time'}</div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Backdrop when sidebar open */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content (no top margin) */}
      <main className="flex-1 p-6">
        <div className="flex items-center gap-3 mb-4">
          {/* Hamburger moved into header */}
          <button
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="p-2 bg-white text-gray-800 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M4 6H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 18H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <h2 className="text-xl font-semibold">{course?.title ?? 'Course'}</h2>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden sm:block w-36">
              <div className="text-sm text-gray-600 flex items-center justify-between"><span>Progress</span><span className="ml-2 font-semibold">{progressPercent}%</span></div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <button onClick={() => navigate('/my-courses')} className="px-3 py-1 rounded-md border border-gray-300 text-sm">Exit Course</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default CourseLearningLayout
