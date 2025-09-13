import React from 'react'
import { useParams } from 'react-router-dom'
import QuizPlayer from '../components/QuizPlayer'

export default function QuizPage() {
  const { courseId, quizId } = useParams()
  return (
    <div className="max-w-3xl mx-auto p-4">
      <QuizPlayer quizId={quizId} courseId={courseId} />
    </div>
  )
}
