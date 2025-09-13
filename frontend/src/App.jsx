import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CourseList from './pages/CourseList'
import CourseDetails from './pages/CourseDetails'
import MyCourses from './pages/MyCourses'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminCourses from './pages/AdminCourses'
import AdminCourseLessons from './components/AdminCourseLessons'
import AdminCourseQuizzes from './components/AdminCourseQuizzes'
import CreateLesson from './pages/CreateLesson'
import ProtectedRoute from './components/ProtectedRoute'
import CourseLearningLayout from './components/CourseLearningLayout'
import LessonContent from './components/LessonContent'
import QuizPage from './pages/QuizPage'
import UsersList from './pages/UsersList'
import UserProfile from './pages/UserProfile'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<CourseList />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route
          path="my-courses"
          element={
            <ProtectedRoute>
              <MyCourses />
            </ProtectedRoute>
          }
        />
        <Route path="admin">
          <Route
            index
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute requireAdmin>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/:courseId/lessons"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCourseLessons />
              </ProtectedRoute>
            }
          />
          <Route
            path="courses/:courseId/quizzes"
            element={
              <ProtectedRoute requireAdmin>
                <AdminCourseQuizzes />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="courses">
          <Route index element={<CourseList />} />
          <Route path=":courseId" element={<CourseDetails />} />
          <Route
            path=":courseId/create-lesson"
            element={
              <ProtectedRoute requireInstructor>
                <CreateLesson />
              </ProtectedRoute>
            }
          />
          <Route
            path=":courseId/learn"
            element={
              <ProtectedRoute>
                <CourseLearningLayout />
              </ProtectedRoute>
            }
          >
            <Route path=":lessonId" element={<LessonContent />} />
            <Route path=":lessonId/quiz/:quizId" element={<QuizPage />} />
            {/* Allow direct quiz links under learn/ for quizzes not tied to a lesson */}
            <Route path="quiz/:quizId" element={<QuizPage />} />
          </Route>
        </Route>
        {/* Public user routes */}
        <Route path="users">
          <Route index element={<UsersList />} />
          <Route path=":id" element={<UserProfile />} />
        </Route>
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Route>
    </Routes>
  )
}

export default App
