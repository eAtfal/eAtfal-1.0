export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' }
  return new Date(dateString).toLocaleDateString(undefined, options)
}

export const truncateText = (text, maxLength = 150) => {
  if (text == null) return ''
  const str = String(text)
  if (str.length <= maxLength) return str
  return str.substr(0, maxLength) + '...'
}

export const calculateProgress = (
  completedLessons,
  totalLessons,
  passedQuizzes = 0,
  totalQuizzes = 0
) => {
  const completed = (completedLessons || 0) + (passedQuizzes || 0)
  const total = (totalLessons || 0) + (totalQuizzes || 0)
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

export const formatDuration = (minutes) => {
  if (!minutes) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`
}
