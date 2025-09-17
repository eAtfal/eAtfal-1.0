import React from 'react'

export default function ProgressBar({ percent = 0, indeterminate = false, height = 'h-3' }) {
  if (indeterminate) {
    return (
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden`}>
        <div className={`bg-indigo-500 ${height} rounded-full w-2/3 animate-pulse`} />
      </div>
    )
  }

  const safe = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height}`}>
      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${safe}%` }} />
    </div>
  )
}
