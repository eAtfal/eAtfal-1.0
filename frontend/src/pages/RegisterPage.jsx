import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from 'react-toastify'
import AuthForm from '../components/AuthForm'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'

function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleRegister = async (data) => {
    try {
      await registerUser(data)
      // Update react-query caches so pages like CourseDetails reflect the new auth/enrollment state
      queryClient.invalidateQueries({ queryKey: ['my-enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['course'] })
      toast.success('🎉 Registration successful!')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 px-4">
      <motion.div
        className="relative overflow-hidden w-full max-w-md bg-white rounded-3xl shadow-xl p-8 animate__animated animate__fadeIn"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h2
          className="text-center text-3xl font-extrabold text-purple-700 mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          Join CourseSphere!
        </motion.h2>

        <AuthForm
          onSubmit={handleRegister}
          submitText="Register"
          isRegister={true}
          className="mb-4"
        />

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-600 font-semibold hover:underline transition-colors"
          >
            Login here
          </Link>
        </p>

        {/* Fun animated shapes in the background */}
        <div className="pointer-events-none absolute top-0 left-0 w-64 h-64 bg-pink-300 rounded-full blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 bg-yellow-300 rounded-full blur-3xl opacity-50 translate-x-1/3 translate-y-1/3"></div>
      </motion.div>
    </div>
  )
}

export default RegisterPage