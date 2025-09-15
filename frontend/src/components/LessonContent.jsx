import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import ReactMarkdown from 'react-markdown'
import { lessonsAPI, leaderboardAPI } from '../api'
import LessonCompletePopup from './LessonCompletePopup'
import { FaArrowLeft, FaArrowRight, FaSpinner, FaCheckCircle } from 'react-icons/fa'
import { motion } from 'framer-motion'

function LessonContent() {
  const { courseId, lessonId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showComplete, setShowComplete] = useState(false)
  const [marking, setMarking] = useState(false)
  const completedKey = `lessonCompleted:${courseId}:${lessonId}`

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['lesson', courseId, lessonId],
    queryFn: () => lessonsAPI.get(courseId, lessonId).then(res => res.data)
  })

  const completeLessonMutation = useMutation({
    mutationFn: () => lessonsAPI.complete(courseId, lessonId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['lesson', courseId, lessonId] })
      await queryClient.cancelQueries({ queryKey: ['lessons', courseId] })
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })

      const previousLesson = queryClient.getQueryData(['lesson', courseId, lessonId])
      const previousLessons = queryClient.getQueryData(['lessons', courseId])
      const previousCourse = queryClient.getQueryData(['course', courseId])

      // Debug: log previous lessons and lessonId for troubleshooting (show explicit id-like keys)
      try {
        const ids = (previousLessons || []).map(l => ({ id: l.id, lesson_id: l.lesson_id, pk: l.pk, _id: l._id, keys: Object.keys(l) }))
        // eslint-disable-next-line no-console
        console.debug('[onMutate] previousLessons ids:', ids, 'marking lessonId:', lessonId)
      } catch (e) {}

      const matchesId = (l, target) => {
        const t = String(target)
        return [l?.id, l?.lesson_id, l?.pk, l?._id].some(v => typeof v !== 'undefined' && String(v) === t)
      }

      queryClient.setQueryData(['lesson', courseId, lessonId], old => old ? { ...old, completed: true } : old)
      queryClient.setQueryData(['lessons', courseId], old => {
        const updated = old ? old.map(l => matchesId(l, lessonId) ? { ...l, completed: true } : l) : old
        try {
          // eslint-disable-next-line no-console
          console.debug('[onMutate] updatedLessons ids:', (updated || []).map(l => ({ id: l.id, lesson_id: l.lesson_id, pk: l.pk, _id: l._id, completed: l.completed })))
        } catch (e) {}
        return updated
      })
      queryClient.setQueryData(['course', courseId], old => old ? { ...old, completed_lessons: (old.completed_lessons || 0) + 1 } : old)

      // Try to fetch current leaderboard to determine previous rank
      let previousLeaderboardPlayers = []
      try {
        const lb = await leaderboardAPI.getGlobal()
        previousLeaderboardPlayers = lb.data || []
      } catch (e) {
        previousLeaderboardPlayers = []
      }

      return { previousLesson, previousLessons, previousCourse, previousLeaderboardPlayers }
    },
    onError: (error, variables, context) => {
      if (context?.previousLesson) queryClient.setQueryData(['lesson', courseId, lessonId], context.previousLesson)
      if (context?.previousLessons) queryClient.setQueryData(['lessons', courseId], context.previousLessons)
      if (context?.previousCourse) queryClient.setQueryData(['course', courseId], context.previousCourse)
      setMarking(false)
      try { localStorage.removeItem(completedKey) } catch (e) {}
      toast.error(error.response?.data?.detail || 'Failed to complete lesson')
    },
    onSuccess: async (data, variables, context) => {
      // After marking lesson complete, fetch updated leaderboard to show new rank/points
      try {
        const res = await leaderboardAPI.getGlobal()
        const players = res.data || []
        // Determine current user id from localStorage normalized user
        const stored = localStorage.getItem('user')
        const parsed = stored ? JSON.parse(stored) : null
        const myId = parsed?.id

        // Previous leaderboard from onMutate context (best-effort)
        const prevPlayers = context?.previousLeaderboardPlayers || []
        const prevIndex = prevPlayers.findIndex(p => String(p.id) === String(myId))
        const previousRank = prevIndex >= 0 ? prevIndex + 1 : null

        // New leaderboard
        const myEntry = players.find(p => String(p.id) === String(myId))
        const newRank = myEntry ? players.findIndex(p => String(p.id) === String(myId)) + 1 : null
        const totalPoints = myEntry ? myEntry.points : null

        const delta = (previousRank && newRank) ? (previousRank - newRank) : null

        // Store in state by embedding in the popup props via setShowComplete
        setShowComplete({ show: true, earnedPoints: 10, previousRank, newRank, delta, totalPoints })
        try { localStorage.setItem(completedKey, '1') } catch (e) {}
      } catch (e) {
        // fallback UX if leaderboard fails
        setShowComplete({ show: true, earnedPoints: 10, previousRank: null, newRank: null, delta: null, totalPoints: null })
        try { localStorage.setItem(completedKey, '1') } catch (e) {}
      }

      toast.success('🎉 Lesson completed!')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson', courseId, lessonId] })
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] })
      queryClient.invalidateQueries({ queryKey: ['course', courseId] })
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
    }
  })

  const handleMarkComplete = () => {
    if (marking || completeLessonMutation.isLoading) return
    setMarking(true)
    completeLessonMutation.mutate()
  }

  const isPersistedCompleted = () => {
    try { return Boolean(localStorage.getItem(completedKey)) } catch (e) { return false }
  }
  const isCompleted = Boolean(lesson?.completed) || isPersistedCompleted()

  const handleNext = () => {
    // Navigate to the next logical item (next lesson, then quizzes, then course)
    try {
      if (lesson && lesson.next_lesson_id) {
        navigate(`/courses/${courseId}/learn/${lesson.next_lesson_id}`)
        return
      }

      const lessonsList = queryClient.getQueryData(['lessons', courseId]) || []
      const quizzesList = queryClient.getQueryData(['quizzes', courseId]) || []

      const matchesId = (l, target) => {
        const t = String(target)
        return [l?.id, l?.lesson_id, l?.pk, l?._id].some(v => typeof v !== 'undefined' && String(v) === t)
      }

      const idx = lessonsList.findIndex(l => matchesId(l, lessonId))
      if (idx >= 0 && idx < lessonsList.length - 1) {
        const next = lessonsList[idx + 1]
        const nextId = next?.id ?? next?.lesson_id ?? next?.pk ?? next?._id
        if (nextId) {
          navigate(`/courses/${courseId}/learn/${nextId}`)
          return
        }
      }

      if ((quizzesList || []).length > 0) {
        const q = quizzesList[0]
        if (q && q.id) {
          navigate(`/courses/${courseId}/learn/quiz/${q.id}`)
          return
        }
      }

      navigate(`/courses/${courseId}`)
    } catch (e) {
      navigate(`/courses/${courseId}`)
    }
  }

  const goToNext = () => {
    // Reuse same logic as handleNext
    handleNext()
  }

  const renderVideo = (url) => {
    if (!url) return null

    const youtubeRegex = /(?:youtube(?:-nocookie)?\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
    const yt = url.match(youtubeRegex)
    if (yt) return (
      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-[720px] md:max-w-[720px] rounded-xl overflow-hidden shadow-lg">
          <div className="relative pb-[56.25%] h-0">
            <iframe
              src={`https://www.youtube.com/embed/${yt[1]}`}
              title={lesson.title}
              frameBorder="0"
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    )

    const vimeoRegex = /vimeo\.com\/(\d+)/
    const v = url.match(vimeoRegex)
    if (v) return (
      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-[720px] md:max-w-[720px] rounded-xl overflow-hidden shadow-lg">
          <div className="relative pb-[56.25%] h-0">
            <iframe
              src={`https://player.vimeo.com/video/${v[1]}`}
              title={lesson.title}
              frameBorder="0"
              className="absolute top-0 left-0 w-full h-full"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    )

    const videoFileRegex = /\.(mp4|webm|ogg)(\?.*)?$/i
    if (videoFileRegex.test(url)) return (
      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-[720px] md:max-w-[720px] rounded-xl overflow-hidden shadow-lg">
          <video controls className="w-full h-auto">
            <source src={url} />
          </video>
        </div>
      </div>
    )

    return (
      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-[720px] md:max-w-[720px] rounded-xl overflow-hidden shadow-lg">
          <iframe src={url} title={lesson.title} className="w-full h-64" allowFullScreen />
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mt-2 block">Open in new tab</a>
      </div>
    )
  }

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <FaSpinner className="animate-spin text-5xl text-purple-500" />
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-md text-center">
      Error loading lesson: {error.message}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <LessonCompletePopup
        show={typeof showComplete === 'object' ? showComplete.show : showComplete}
        onClose={() => setShowComplete(false)}
        title="🎉 Well done!"
        message="You completed the lesson and earned progress."
        autoCloseMs={4000}
        earnedPoints={typeof showComplete === 'object' ? showComplete.earnedPoints : 10}
        newRank={typeof showComplete === 'object' ? showComplete.newRank : null}
        totalPoints={typeof showComplete === 'object' ? showComplete.totalPoints : null}
      />

      {/* Lesson Title */}
      <motion.h2
        className="text-3xl font-extrabold text-purple-700"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {lesson.title}
      </motion.h2>

      {/* Video */}
      {lesson.video_url && renderVideo(lesson.video_url)}

      {/* Content */}
      <motion.div
        className="bg-white p-6 rounded-2xl shadow-lg prose max-w-full"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <ReactMarkdown>{lesson.content}</ReactMarkdown>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-4 flex-wrap gap-2">
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-300 text-purple-700 hover:bg-purple-50 transition"
          onClick={() => window.history.back()}
        >
          <FaArrowLeft /> Back
        </button>
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              className={
                "flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white transition shadow-lg " +
                (marking || completeLessonMutation.isLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-green-600")
              }
              onClick={handleMarkComplete}
              disabled={marking || completeLessonMutation.isLoading}
              aria-disabled={marking || completeLessonMutation.isLoading}
            >
              {completeLessonMutation.isLoading ? (
                <>
                  <FaSpinner className="animate-spin" /> Loading...
                </>
              ) : (
                <>
                  <FaCheckCircle /> Mark as Complete
                </>
              )}
            </button>
          )}

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white transition shadow-lg hover:bg-indigo-700"
            onClick={goToNext}
          >
            Go to next item <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  )
}

export default LessonContent