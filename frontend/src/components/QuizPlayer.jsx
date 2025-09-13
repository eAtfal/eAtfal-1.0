import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import quizAPI from '../api/quiz'
import { enrollmentsAPI, coursesAPI } from '../api'
import { calculateProgress } from '../utils/format'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import QuizResultPopup from './QuizResultPopup'

function ProgressBar({ current, total }) {
  const pct = calculateProgress(current, total)
  return (
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className="h-2 bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-400 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function QuizPlayer({ courseId, quizId, renderSingle = false }) {
  const queryClient = useQueryClient()
  const { data: quiz, isLoading } = useQuery({ queryKey: ['quiz', quizId], queryFn: () => quizAPI.get(quizId).then(r => r.data), enabled: !!quizId })
  const [answers, setAnswers] = useState({})
  const [submittedAttempt, setSubmittedAttempt] = useState(null)
  const [showResultPopup, setShowResultPopup] = useState(false)
  
  // Reset local UI state when quizId changes (prevents stale 100%/submitted state)
  React.useEffect(() => {
    setAnswers({})
    setSubmittedAttempt(null)
    setShowResultPopup(false)
  }, [quizId])

  const totalQuestions = quiz?.questions?.length || 0
  const answeredCount = Object.keys(answers).length

  const submitMutation = useMutation({
    mutationFn: (payload) => quizAPI.submit(quizId, payload).then(r => r.data),
    onSuccess: (data) => {
      setSubmittedAttempt(data)
      // Show pass/fail popup
      const passed = data.total > 0 ? (data.score * 1.0) >= (data.total * 0.5) : false
      setShowResultPopup(true)
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] })
      // Invalidate enrollments so passed_quizzes / progress updates are reflected
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      // Also refresh course-level data if we have a courseId — fetch the fresh course object
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        // Also refresh quizzes for the course so course details picks up passed_quizzes
        queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] })
        coursesAPI.get(courseId)
          .then(res => {
            const freshCourse = res.data
            console.debug('[QuizPlayer] fetched fresh course after submit', { courseId, freshCourse })
            queryClient.setQueryData(['course', courseId], freshCourse)
          })
          .catch(err => {
            console.warn('[QuizPlayer] failed to fetch fresh course after submit', err)
          })
        // Also fetch quizzes to update cache immediately
        quizAPI.getCourseQuizzes(courseId)
          .then(res => {
            const fetched = res.data
            try {
              const submittedQuizId = data?.quiz_id || quizId
              const passed = (data && typeof data.total !== 'undefined' && data.total > 0) ? (data.score >= (data.total * 0.5)) : (data && data.passed === true)
              const prev = queryClient.getQueryData(['course-quizzes', courseId])

              // Merge fetched with previous cache to preserve any existing flags (like passed)
              let merged
              if (Array.isArray(fetched)) {
                merged = fetched.map(fq => {
                  const prevQ = Array.isArray(prev) ? prev.find(p => p.id === fq.id) : undefined
                  return {
                    ...fq,
                    passed: (typeof fq.passed !== 'undefined' ? fq.passed : prevQ?.passed),
                    user_passed: (typeof fq.user_passed !== 'undefined' ? fq.user_passed : prevQ?.user_passed)
                  }
                })
              } else {
                merged = fetched
              }

              // If this submission passed, ensure the submitted quiz is marked passed locally
              if (submittedQuizId && passed && Array.isArray(merged)) {
                merged = merged.map(q => q.id === submittedQuizId ? { ...q, passed: true, user_passed: true } : q)
              }

              queryClient.setQueryData(['course-quizzes', courseId], merged)
            } catch (e) {
              queryClient.setQueryData(['course-quizzes', courseId], fetched)
            }
          })
          .catch(() => {/* noop */})
      }
      toast.success(`You scored ${data.score}/${data.total}`)
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to submit'
      toast.error(msg)
    }
  })

  const handleSelect = (questionId, optionId) => {
    if (submittedAttempt) return // prevent changes after submit
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleSubmit = () => {
    if (!quiz) return
  const payload = { answers: quiz.questions.map(q => ({ question_id: q.id, selected_option_id: answers[q.id] ?? null })) }
  submitMutation.mutate(payload)
  }

  const handleRetry = () => {
    // Allow user to retry: clear local answers and submittedAttempt, and refresh quiz data
    setAnswers({})
    setSubmittedAttempt(null)
    setShowResultPopup(false)
    // Refresh quiz data and attempts
    queryClient.invalidateQueries({ queryKey: ['quiz', quizId] })
    queryClient.invalidateQueries({ queryKey: ['quiz-attempts', quizId] })
  }

  if (isLoading) return <div className="p-4">Loading quiz…</div>
  if (!quiz) return <div className="p-4">No quiz found</div>

  return (
    <div className="bg-white/80 p-4 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">{quiz.title}</h3>
        <div className="text-sm text-slate-600">{answeredCount}/{totalQuestions} answered</div>
      </div>

      <ProgressBar current={answeredCount} total={totalQuestions} />

      <div className="mt-4 space-y-4">
        {quiz.questions.map((q, idx) => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl border border-slate-100">
            <div className="flex items-start gap-3">
              <div className="text-slate-500 font-semibold">{idx + 1}.</div>
              <div className="flex-1">
                <div className="mb-2 font-medium text-slate-800">{q.text}</div>
                <div className="space-y-2">
                  {q.options.map(o => {
                      const selected = answers[q.id] === o.id
                      // Do not reveal which option is correct. After submission, only mark the user's selected choice.
                      return (
                        <button
                          key={o.id}
                          onClick={() => handleSelect(q.id, o.id)}
                          disabled={!!submittedAttempt}
                          className={`w-full text-left p-2 rounded-lg border ${selected ? 'ring-2 ring-sky-300' : 'border-slate-100'} hover:bg-slate-50 transition flex items-center justify-between`}
                        >
                          <span>{o.text}</span>
                          {selected && (
                            <span className={`ml-2 text-sm text-slate-600`}>Your choice</span>
                          )}
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
  <div className="text-sm text-slate-600">Progress: {calculateProgress(answeredCount, totalQuestions)}%</div>
        <div className="flex items-center gap-2">
          <button onClick={handleSubmit} disabled={submitMutation.isLoading || submittedAttempt} className="px-4 py-2 bg-sky-600 text-white rounded-lg">
            {submitMutation.isLoading ? 'Submitting…' : (submittedAttempt ? 'Submitted' : 'Submit')}
          </button>
          {submittedAttempt && quiz?.allow_retry && (
            <button onClick={handleRetry} className="px-4 py-2 bg-amber-500 text-white rounded-lg">
              Retry
            </button>
          )}
        </div>
      </div>

      {submittedAttempt && (
        <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
          <div className="font-semibold">Result: {submittedAttempt.score}/{submittedAttempt.total}</div>
          <div className="text-sm text-slate-600">Submitted at: {new Date(submittedAttempt.created_at).toLocaleString()}</div>
        </div>
      )}
      <QuizResultPopup
        show={showResultPopup}
        type={(submittedAttempt && submittedAttempt.total > 0 && (submittedAttempt.score * 1.0) >= (submittedAttempt.total * 0.5)) ? 'pass' : 'fail'}
        onClose={() => setShowResultPopup(false)}
      />
    </div>
  )
}