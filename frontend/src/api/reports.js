import api from './index'

export const reportsAPI = {
  enrollments: () => api.get('/admin/reports/enrollments'),
  completion: () => api.get('/admin/reports/completion'),
  dropoffs: () => api.get('/admin/reports/dropoffs'),
  averageTime: () => api.get('/admin/reports/average-time'),
  quizPerformance: () => api.get('/admin/reports/quiz-performance'),
  leaderboard: () => api.get('/admin/reports/leaderboard'),
}

export default reportsAPI
