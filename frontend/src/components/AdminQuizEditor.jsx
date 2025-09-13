import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import quizAPI from '../api/quiz'
import { toast } from 'react-toastify'

export default function AdminQuizEditor({ courseId, onSuccess }) {
  const [serverErrors, setServerErrors] = useState(null)
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      title: '',
      allow_retry: false,
  questions: [{ text: '', order_index: 0, options: [{ text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }] }]
    }
  })

  const { fields: questions, append: appendQuestion, remove: removeQuestion } = useFieldArray({ control, name: 'questions' })

  const mutation = useMutation({
    mutationFn: (payload) => quizAPI.createCourseQuiz(courseId, payload).then(r => r.data),
    onSuccess: (data) => {
      toast.success('Quiz created')
      reset()
      if (onSuccess) onSuccess(data)
      // Redirect admin to manage quizzes for the course
      try {
        const adminPath = `/admin/courses/${courseId}/quizzes`
        history.pushState({}, '', adminPath)
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (e) {
        // fallback
        window.location.href = `/admin/courses/${courseId}/quizzes`
      }
    },
    onError: (err) => {
      const resp = err.response?.data
      if (err.response?.status === 422 && resp) {
        // FastAPI validation errors are helpful as an array under detail
        setServerErrors(resp)
        toast.error('Validation error: check details below')
      } else {
        setServerErrors(null)
        toast.error(resp?.detail || resp || err.message || 'Failed to create quiz')
      }
    }
  })

  // preprocess and validate before sending to backend
  const onSubmit = (v) => {
    // simple validation
    if (!v.title || !v.title.trim()) {
      toast.error('Please provide a quiz title')
      return
    }

    const questions = (v.questions || []).map((q, idx) => {
      const options = (q.options || [])
        .filter(o => o && typeof o.text === 'string' && o.text.trim().length > 0)
        .map(o => ({ text: o.text.trim(), is_correct: !!o.is_correct }))

      return {
        text: (q.text || '').trim(),
        order_index: typeof q.order_index === 'number' ? q.order_index : idx,
        options
      }
    }).filter(q => q.text.length > 0 && q.options.length > 0)

    const payload = {
      title: v.title.trim(),
      allow_retry: !!v.allow_retry,
      questions: questions.length ? questions : undefined
    }

    // final client-side sanity checks
    if (payload.questions) {
      for (const q of payload.questions) {
        if (!q.options.length) {
          toast.error('Each question must have at least one option with text')
          return
        }
      }
    }

  // Do not log full payload (avoid leaking correct answers)
  setServerErrors(null)
  mutation.mutate(payload)
  }

  return (
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium">Quiz Title</label>
        <input {...register('title')} className="mt-1 block w-full rounded-md border-gray-200" />
      </div>
      <div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" {...register('allow_retry')} /> <span className="text-sm">Allow retry</span>
        </label>
      </div>

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div key={q.id} className="p-3 border rounded">
            <div className="flex justify-between items-center mb-2">
              <strong>Question {qi + 1}</strong>
              <button type="button" onClick={() => removeQuestion(qi)} className="text-rose-600">Remove</button>
            </div>
            <div>
              <input {...register(`questions.${qi}.text`)} placeholder="Question text" className="w-full rounded border p-1" />
            </div>
            <div className="mt-2 space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="space-y-2">
                {/* the frontend keeps nested option arrays; for brevity we render 4 fixed option controls */}
                {[0,1,2,3].map(oi => (
                  <div key={oi} className="flex items-center gap-2">
                    <input {...register(`questions.${qi}.options.${oi}.text`)} placeholder={`Option ${oi + 1}`} className="flex-1 rounded border p-1" />
                    <label className="inline-flex items-center gap-1 text-sm">
                      <input type="checkbox" {...register(`questions.${qi}.options.${oi}.is_correct`)} /> Correct
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => appendQuestion({ text: '', order_index: questions.length, options: [{ text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }, { text: '', is_correct: false }] })} className="px-3 py-1 bg-sky-600 text-white rounded">Add Question</button>
        <button type="submit" disabled={mutation.isLoading} className="px-4 py-2 bg-emerald-600 text-white rounded">{mutation.isLoading ? 'Saving…' : 'Create Quiz'}</button>
      </div>

      {serverErrors && (
        <div className="bg-red-50 border border-red-100 p-3 rounded text-sm text-red-800">
          <div className="font-semibold mb-2">Server validation errors (422):</div>
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(serverErrors, null, 2)}</pre>
        </div>
      )}
    </form>
  )
}
