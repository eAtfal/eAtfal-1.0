import api from './index'

const quizAPI = {
  // Public and course-scoped quiz endpoints
  getCourseQuizzes: (courseId) => api.get(`/courses/${courseId}/quizzes`),
  get: (id) => api.get(`/quizzes/${id}`),
  submit: (quizId, data) => api.post(`/quizzes/${quizId}/submit`, data),
  getAttempts: (quizId) => api.get(`/quizzes/${quizId}/attempts`),
  // Admin/instructor course-level quiz creation
  createCourseQuiz: (courseId, data) => api.post(`/courses/${courseId}/quizzes`, data),
  addQuestion: (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data),
  deleteCourseQuiz: (courseId, quizId) => api.delete(`/courses/${courseId}/quizzes/${quizId}`),
}

export default quizAPI
