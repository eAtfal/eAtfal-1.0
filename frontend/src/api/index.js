import axios from 'axios'

// Create axios instance
export const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// export const api = axios.create({
//   baseURL: 'http://192.168.1.100:8000/api/v1',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// })

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
  if (error.response?.status === 401) {
      // Clear stored auth and notify app (avoids full page reload)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      try {
        window.dispatchEvent(new Event('authChanged'))
    // dispatched authChanged due to 401
      } catch (e) {}
      // Soft navigate to /login so router updates without hard reload
      try {
        history.pushState({}, '', '/login')
        window.dispatchEvent(new PopStateEvent('popstate'))
      } catch (e) {
        // Fallback
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Admin user management
export const usersAPI = {
  getAllUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`)
}

export const authAPI = {
  login: (credentials) => {
    const formData = new URLSearchParams()
    formData.append('username', credentials.email)
    formData.append('password', credentials.password)
    return api.post('/auth/login', formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
  },
  register: (userData) => {
    const form = new URLSearchParams()
    form.append('email', userData.email)
    form.append('password', userData.password)
    form.append('full_name', userData.full_name) // Changed from userData.name to userData.full_name
    return api.post('/auth/register', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
  },
  me: () => api.get('/auth/me'),
}

export const coursesAPI = {
  getAll: () => api.get('/courses'),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
}

export const lessonsAPI = {
  getAll: (courseId) => api.get(`/courses/${courseId}/lessons`),
  get: (courseId, lessonId) => api.get(`/courses/${courseId}/lessons/${lessonId}`),
  create: (courseId, data) => api.post(`/courses/${courseId}/lessons`, data),
  complete: (courseId, lessonId) => api.post(`/courses/${courseId}/lessons/${lessonId}/complete`),
  update: (courseId, lessonId, data) => 
    api.put(`/courses/${courseId}/lessons/${lessonId}`, data),
  delete: (courseId, lessonId) => 
    api.delete(`/courses/${courseId}/lessons/${lessonId}`),
}

export const enrollmentsAPI = {
  getMyEnrollments: () => api.get('/enrollments/me'),
  enroll: (courseId) => api.post(`/courses/${courseId}/enroll`),
  unenroll: (courseId) => api.delete(`/courses/${courseId}/enroll`),
}

import quizAPI from './quiz'
export { quizAPI }

// Admin/instructor quiz management
// Admin quiz operations use `quizAPI.createCourseQuiz` or server quiz endpoints in `./quiz`

export const reviewsAPI = {
  getAll: (courseId) => api.get(`/courses/${courseId}/reviews`),
  create: (courseId, data) => api.post(`/courses/${courseId}/reviews`, data),
  update: (courseId, reviewId, data) => 
    api.put(`/courses/${courseId}/reviews/${reviewId}`, data),
  delete: (courseId, reviewId) => 
    api.delete(`/courses/${courseId}/reviews/${reviewId}`),
}

export default api
