import api from './index'

export const reportsAPI = {
  enrollments: (params) => api.get('/admin/reports/enrollments', { params }),
  completion: (params) => api.get('/admin/reports/completion', { params }),
  dropoffs: (params) => api.get('/admin/reports/dropoffs', { params }),
  averageTime: (params) => api.get('/admin/reports/average-time', { params }),
  quizPerformance: (params) => api.get('/admin/reports/quiz-performance', { params }),
  leaderboard: (params) => api.get('/admin/reports/leaderboard', { params }),
}

export default reportsAPI
