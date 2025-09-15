import { useQuery } from '@tanstack/react-query'
import { enrollmentsAPI } from '../api'
import { useQueryClient } from '@tanstack/react-query'
import CourseCard from '../components/CourseCard'
import { Link } from 'react-router-dom'
import { calculateProgress } from '../utils/format'
import { toast } from 'react-toastify'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import scrollToTop from '../utils/scrollToTop';

function MyCourses() {
  const queryClient = useQueryClient()
  const {
    data: enrollments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: () => enrollmentsAPI.getMyEnrollments().then((res) => res.data),
  })


  // Ensure the courses page scrolls to top when navigated to
  useEffect(() => {
    scrollToTop({ behavior: 'smooth', focusSelector: null });
  }, []);

  // Refetch enrollments when auth status changes (login/register/logout)
  // so the UI doesn't require a manual refresh to show enrollment/progress
  useEffect(() => {
    const onAuth = () => queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
    window.addEventListener('authChanged', onAuth)
    return () => window.removeEventListener('authChanged', onAuth)
  }, [queryClient])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-center">
        Error loading your courses: {error?.message || 'Something went wrong'}
      </div>
    )
  }

  const normalizedEnrollments = (enrollments || []).map(e => {
    const completedLessons = e.completed_lessons ?? e.completed ?? 0
    const totalLessons = e.total_lessons ?? e.course?.total_lessons ?? 0
    const totalQuizzes = e.total_quizzes ?? 0
    const passedQuizzes = e.passed_quizzes ?? 0

    // Prefer server-provided percent when available (it already accounts for quizzes)
    let percent = typeof e.percent_complete === 'number' ? e.percent_complete : null

    if (percent === null) {
      percent = calculateProgress(completedLessons, totalLessons, passedQuizzes, totalQuizzes)
    }

    return {
      ...e,
      completed_lessons: completedLessons,
      total_lessons: totalLessons,
      total_quizzes: totalQuizzes,
      passed_quizzes: passedQuizzes,
      percent_complete: percent,
    }
  })

  const inProgressCourses = normalizedEnrollments.filter(e => (e.percent_complete ?? 0) < 100)
  const completedCourses = normalizedEnrollments.filter(e => (e.percent_complete ?? 0) >= 100)

  const buildCourseForCard = (enrollment) => ({
    ...(enrollment.course || {}),
    id: enrollment.course?.id ?? enrollment.course_id ?? enrollment.id,
    title: enrollment.course?.title ?? enrollment.course_title ?? 'Course',
    total_lessons: enrollment.total_lessons ?? enrollment.course?.lesson_count ?? 0,
    completed_lessons: enrollment.completed_lessons ?? 0,
    rating: enrollment.course?.average_rating ?? enrollment.course?.rating ?? null,
    instructor_name: enrollment.course?.instructor?.full_name ?? enrollment.course?.instructor_name ?? '',
  })

  const downloadCertificate = async (enrollment) => {
    const courseId = enrollment.course?.id ?? enrollment.course_id ?? enrollment.id
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('You must be logged in to download certificates')
      return
    }

    try {
      const res = await fetch(`/api/v1/courses/${courseId}/certificate`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        let data = null
        try { data = await res.json() } catch { }
        toast.error(data?.detail || 'Failed to download certificate')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const safeTitle = (enrollment.course?.title || 'course')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_\-]/g, '')
      a.href = url
      a.download = `certificate_${safeTitle}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('🎉 Certificate downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to download certificate')
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Mobile-only centered welcome */}
      <div className="md:hidden text-center mb-6">
        <h2 className="text-2xl font-extrabold text-purple-700">Welcome Back to CourseSphere</h2>
        <p className="mt-2 text-sm text-gray-600">Let's continue your learning adventure 🚀</p>
      </div>

      {/* Desktop / tablet heading */}
      <h1 className="hidden md:block text-3xl font-extrabold text-purple-700 mb-10 text-center">
        My Learning Journey
      </h1>

      {/* In Progress Courses */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-600">In Progress</h2>
        {inProgressCourses.length === 0 ? (
          <p className="text-gray-600 text-center py-6">
            You haven't started any courses yet. Start exploring and have fun learning! 🌟
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgressCourses.map((enrollment) => {
              const lessons = enrollment.course?.lessons || []
              let targetLessonId = lessons[0]?.id
              if (enrollment.last_lesson_id) {
                const idx = lessons.findIndex(l => l.id === enrollment.last_lesson_id)
                if (idx >= 0 && idx < lessons.length - 1) targetLessonId = lessons[idx + 1].id
                else if (lessons.length > 0 && idx === lessons.length - 1) targetLessonId = lessons[idx].id
              }

              const progress = calculateProgress(
                enrollment.completed_lessons,
                enrollment.total_lessons,
                enrollment.passed_quizzes,
                enrollment.total_quizzes
              )

              return (
                <motion.div
                  key={enrollment.id}
                  className="bg-white rounded-3xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform flex flex-col"
                  whileHover={{ scale: 1.02 }}
                >
                  <CourseCard course={buildCourseForCard(enrollment)} />
                  <div className="p-4 mt-auto">
                    <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-end">
                      {lessons.length > 0 && (
                        <Link
                          to={`/courses/${enrollment.course?.id ?? enrollment.course_id ?? enrollment.id}/learn/${targetLessonId}`}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                        >
                          Continue
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </section>

      {/* Completed Courses */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-green-600">Completed</h2>
        {completedCourses.length === 0 ? (
          <p className="text-gray-600 text-center py-6">
            You haven't completed any courses yet. Keep going! 🚀
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedCourses.map((enrollment) => (
              <motion.div
                key={enrollment.id}
                className="bg-white rounded-3xl shadow-lg overflow-hidden hover:scale-[1.02] transition-transform flex flex-col"
                whileHover={{ scale: 1.02 }}
              >
                <CourseCard course={buildCourseForCard(enrollment)} />
                <div className="p-4 mt-auto flex flex-col items-center gap-2 text-yellow-500 font-semibold">
                  <span>🏆 Completed!</span>
                  <button
                    onClick={() => downloadCertificate(enrollment)}
                    className="mt-2 px-3 py-1 bg-yellow-400 text-white rounded-lg text-sm hover:bg-yellow-500 transition-colors"
                  >
                    Download Certificate
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default MyCourses