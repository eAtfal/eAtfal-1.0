import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { coursesAPI, enrollmentsAPI, lessonsAPI, reviewsAPI, quizAPI } from '../api'
import { useAuth } from '../hooks/useAuth.jsx'
import { formatDate, formatDuration, calculateProgress } from '../utils/format'
import ProgressRing from '../components/ProgressRing'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, Clock, Loader2, MoveRight, Play, Users, Star, Share2, Download } from 'lucide-react'

function CourseDetails() {
  const { courseId } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [titleClicked, setTitleClicked] = useState(false)

  useEffect(() => {
    const onAuthChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
    window.addEventListener('authChanged', onAuthChanged)
    window.addEventListener('storage', onAuthChanged)
    return () => {
      window.removeEventListener('authChanged', onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
    }
  }, [courseId, queryClient])

  const { data: course, isLoading, error } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesAPI.get(courseId).then(res => res.data)
  })

  // Fetch quizzes separately (course response may not include quizzes)
  const { data: quizzes } = useQuery({
    queryKey: ['course-quizzes', courseId],
    queryFn: () => quizAPI.getCourseQuizzes(courseId).then(res => res.data),
    enabled: !!courseId
  })

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentsAPI.enroll(courseId),
    onSuccess: async () => {
      const res = await coursesAPI.get(courseId)
      const freshCourse = res.data
      queryClient.setQueryData(['course', courseId], freshCourse)
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      toast.success('🎉 Enrolled! Start your adventure! 🚀')
      if (freshCourse.lessons?.length) navigate(`/courses/${courseId}/learn/${freshCourse.lessons[0].id}`)
    },
    onError: async (error) => {
      const detail = error.response?.data?.detail ?? ''
      if (error.response?.status === 400 && detail.toLowerCase().includes('already enrolled')) {
        const res = await coursesAPI.get(courseId)
        const freshCourse = res.data
        queryClient.setQueryData(['course', courseId], freshCourse)
        toast.info('✨ Already enrolled! Let’s go learn!')
        if (freshCourse.lessons?.length) navigate(`/courses/${courseId}/learn/${freshCourse.lessons[0].id}`)
      } else toast.error(detail || 'Oops! Enrollment failed 😢')
    }
  })

  const unenrollMutation = useMutation({
    mutationFn: () => enrollmentsAPI.unenroll(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      toast.success('✅ Unenrolled successfully!')
    },
    onError: (error) => toast.error(error.response?.data?.detail || 'Failed to unenroll')
  })

  const lessonCompleteMutation = useMutation({
    mutationFn: ({ lessonId }) => lessonsAPI.complete(courseId, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      toast.success('Lesson marked complete')
    },
    onError: () => toast.error('Failed to mark lesson complete')
  })

  const submitReviewMutation = useMutation({
    mutationFn: ({ text, rating }) => reviewsAPI.create(courseId, { text, rating }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      setReviewText('')
      setReviewRating(5)
      toast.success('Thanks for your review!')
    },
    onError: () => toast.error('Failed to submit review')
  })

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: course.title, url })
      } catch (e) {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard')
      } catch (e) {
        toast.error('Failed to copy link')
      }
    }
  }

  const handleDownloadCertificate = () => {
    if (!user) return toast.error('Please login to download certificate')
    // If backend provides an endpoint, navigate there. Fallback to a placeholder route.
    navigate(`/courses/${courseId}/certificate`)
  }

  // When user is enrolled, clicking the main CTA continues learning.
  // When not enrolled, it enrolls the user.
  const handleEnrollment = () => {
    if (!user) return toast.error('🔑 Please login to enroll')
    if (!course?.is_enrolled) {
      enrollMutation.mutate()
    } else {
      const lessons = course?.lessons || []
      if (!lessons.length) return toast.info('No lessons available for this course')
      const next = lessons.find(l => !l.completed) || lessons[0]
      navigate(`/courses/${courseId}/learn/${next.id}`)
    }
  }

  const handleTitleClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setTitleClicked(true)
      toast.success('Course link copied ✅')
      setTimeout(() => setTitleClicked(false), 900)
    } catch (e) {
      toast.error('Failed to copy link')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <motion.div
          className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
          aria-label="Loading"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-gray-100 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-2 text-red-600">😕 Couldn’t load this course</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Back to Courses <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  // Prefer quizzes fetched from the quizzes endpoint; fallback to course fields
  const totalQuizzes = (quizzes && Array.isArray(quizzes)) ? quizzes.length : (Number(course?.total_quizzes ?? 0))
  // Determine passed quizzes by checking common flags, user attempts, or score fields.
  const isQuizPassed = (q) => {
    try {
      if (!q) return false
      // direct boolean flags
      if (q.passed === true || q.is_passed === true || q.user_passed === true || q.passed_by_user === true) return true

      // Common nested user attempt fields
      const userAttempt = q.user_attempt || q.user_result || q.user_best_attempt
      if (userAttempt) {
        if (userAttempt.passed === true) return true
        if (typeof userAttempt.score !== 'undefined' && typeof userAttempt.total !== 'undefined' && userAttempt.total > 0) {
          return (userAttempt.score >= (userAttempt.total * 0.5))
        }
      }

      // If attempts list exists, try to find a per-user attempt or any attempt marked as passed
      if (Array.isArray(q.attempts) && q.attempts.length) {
        // Prefer attempts that indicate they belong to the current user (common fields)
        const byUser = q.attempts.find(a => a.mine === true || a.is_user_attempt === true || a.user_id === user?.id)
        const candidate = byUser || q.attempts.find(a => a.passed === true)
        if (candidate) {
          if (candidate.passed === true) return true
          if (typeof candidate.score !== 'undefined' && typeof candidate.total !== 'undefined' && candidate.total > 0) return (candidate.score >= (candidate.total * 0.5))
        }
      }

      // Fallback to per-quiz score fields
      if (typeof q.user_score !== 'undefined' && typeof q.total !== 'undefined' && q.total > 0) return (q.user_score >= (q.total * 0.5))
      if (typeof q.score !== 'undefined' && typeof q.total !== 'undefined' && q.total > 0) return (q.score >= (q.total * 0.5))

      return false
    } catch (e) {
      return false
    }
  }

  const passedQuizzes = (quizzes && Array.isArray(quizzes))
    ? quizzes.filter(q => isQuizPassed(q)).length
    : Number(course?.passed_quizzes ?? 0)

  const progressPct = calculateProgress(
    Number(course?.completed_lessons ?? 0),
    Number(course?.total_lessons ?? 0),
    passedQuizzes,
    totalQuizzes
  )

  const combinedCompleted = Number(course?.completed_lessons ?? 0) + passedQuizzes
  const combinedTotal = Number(course?.total_lessons ?? 0) + totalQuizzes

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero header */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-6">
        <div className="group">
          <motion.h1
            onClick={handleTitleClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={titleClicked ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.45 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight cursor-pointer bg-gradient-to-r from-indigo-600 via-pink-500 to-amber-400 bg-clip-text text-transparent select-text"
            title="Click to copy course link"
          >
            {course.title}
          </motion.h1>
          <p className="text-sm text-gray-600 mt-1">{course.subtitle || course.short_description || ''}</p>
          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 text-white"><Users className="h-4 w-4" /> {course.instructor_name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 text-white"><BadgeCheck className="h-4 w-4" /> {formatDate(course.created_at)}</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white"><Clock className="h-4 w-4" /> {formatDuration(course.total_duration)}</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition">Click title to copy link</div>
        </div>

        {/* Enroll + Progress and Actions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-2 bg-white rounded-lg p-4 shadow-md flex items-center gap-4 w-full">
            <ProgressRing
              size={72}
              stroke={7}
              percentage={progressPct}
              completedLessons={course?.completed_lessons}
              totalLessons={course?.total_lessons}
              passedQuizzes={passedQuizzes}
              totalQuizzes={totalQuizzes}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overall progress</p>
                  <p className="text-xl font-bold text-blue-700">{progressPct}%</p>
                </div>
                <div className="text-sm text-gray-500">{combinedCompleted}/{combinedTotal} items</div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Lessons</span>
                    <span>{course?.completed_lessons ?? 0}/{course?.total_lessons ?? 0}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${course?.total_lessons ? Math.round((Number(course?.completed_lessons ?? 0) / Number(course?.total_lessons ?? 0)) * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Quizzes</span>
                    <span>{passedQuizzes}/{totalQuizzes}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: `${totalQuizzes ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleEnrollment}
              disabled={enrollMutation.isLoading || unenrollMutation.isLoading}
              className={`w-full px-4 py-2 rounded-lg font-semibold text-white transition ${course.is_enrolled ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700'}`}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={enrollMutation.isLoading || unenrollMutation.isLoading ? 'loading' : (course.is_enrolled ? 'continue' : 'enroll')}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="inline-flex items-center gap-2 justify-center"
                >
                  {(enrollMutation.isLoading || unenrollMutation.isLoading) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </>
                  ) : course.is_enrolled ? 'Continue Learning' : 'Enroll Now'}
                </motion.span>
              </AnimatePresence>
            </button>

            {/* main CTA now doubles as Enroll or Continue Learning */}

            <button onClick={handleShare} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm">
              <Share2 className="h-4 w-4" /> Share
            </button>

            {(combinedTotal > 0 && combinedCompleted >= combinedTotal) && (
              <button onClick={handleDownloadCertificate} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Download className="h-4 w-4" /> Download Certificate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body sections */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-2 flex gap-2"> 
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-md ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Overview</button>
          <button onClick={() => setActiveTab('syllabus')} className={`px-4 py-2 rounded-md ${activeTab === 'syllabus' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Syllabus</button>
          <button onClick={() => setActiveTab('reviews')} className={`px-4 py-2 rounded-md ${activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>Reviews</button>
        </div>

        <div className="mt-4">
          {activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-2 text-blue-800">📘 About This Course</h2>
              <p className="text-gray-700">{course.description}</p>
            </div>
          )}

          {activeTab === 'syllabus' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">📚 Lessons</h3>
              <div className="divide-y">
                {course.lessons?.map((lesson, idx) => (
                  <div key={lesson.id} className="py-3 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${lesson.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{idx + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-800">{lesson.title}</div>
                        <div className="text-sm text-slate-500">{formatDuration(lesson.duration)}</div>
                      </div>
                      <div className="text-sm text-slate-600 mt-1">{lesson.summary || ''}</div>
                      <div className="mt-2 flex items-center gap-2">
                        {course.is_enrolled ? (
                          <Link to={`/courses/${courseId}/learn/${lesson.id}`} className="text-sm text-blue-600 hover:underline">Open Lesson</Link>
                        ) : (
                          <span className="text-sm text-gray-400">Login to access</span>
                        )}
                        {lesson.completed ? (
                          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">Completed</span>
                        ) : (course.is_enrolled && (
                          <button onClick={() => lessonCompleteMutation.mutate({ lessonId: lesson.id })} className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded-md">Mark complete</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">⭐ Reviews</h3>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">Your rating:</div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReviewRating(n)} className={`p-1 ${reviewRating >= n ? 'text-amber-400' : 'text-gray-300'}`}><Star className="h-5 w-5" /></button>
                    ))}
                  </div>
                </div>
                <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts" className="w-full mt-2 p-2 border rounded-md" rows={3} />
                <div className="flex items-center gap-2">
                  <button onClick={() => submitReviewMutation.mutate({ text: reviewText, rating: reviewRating })} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md">Submit Review</button>
                  <button onClick={() => { setReviewText(''); setReviewRating(5) }} className="mt-2 px-3 py-2 border rounded-md">Reset</button>
                </div>
              </div>

              <div className="pt-4">
                {course.reviews?.length ? (
                  <div className="space-y-3">
                    {course.reviews.map(r => (
                      <div key={r.id} className="bg-gray-50 rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-800">{r.user_name || r.user?.full_name}</span>
                          <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>
                        </div>
                        <p className="text-gray-700 mt-1">{r.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">🚀 No reviews yet — be the first to share your thoughts!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CourseDetails