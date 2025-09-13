import React from 'react'
import PropTypes from 'prop-types'
import { calculateProgress } from '../utils/format'

// Simple SVG circular progress ring. Accepts either a precomputed `percentage`
// or item counts (lessons + quizzes) to compute percentage locally.
export default function ProgressRing({
  size = 80,
  stroke = 8,
  percentage = undefined,
  completedLessons = 0,
  totalLessons = 0,
  passedQuizzes = 0,
  totalQuizzes = 0,
}) {
  // If percentage is not provided, compute from provided counts using shared util
  let pct = typeof percentage === 'number' ? percentage : null
  if (pct === null) {
    pct = calculateProgress(completedLessons, totalLessons, passedQuizzes, totalQuizzes)
  }

  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const strokeDashoffset = circ - (pct / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="prGradient" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#8bc34a" />
        </linearGradient>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle
          r={radius}
          fill="transparent"
          stroke="#e9ecef"
          strokeWidth={stroke}
          cx="0"
          cy="0"
        />
        <circle
          r={radius}
          fill="transparent"
          stroke="url(#prGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90)`}
        />
        <text
          x="0"
          y="0"
          dy="0.35em"
          textAnchor="middle"
          style={{ fontSize: Math.max(12, size * 0.18), fontWeight: 600, fill: '#212529' }}
        >
          {pct}%
        </text>
      </g>
    </svg>
  )
}

ProgressRing.propTypes = {
  size: PropTypes.number,
  stroke: PropTypes.number,
  percentage: PropTypes.number,
  completedLessons: PropTypes.number,
  totalLessons: PropTypes.number,
  passedQuizzes: PropTypes.number,
  totalQuizzes: PropTypes.number,
}
