import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { toast } from 'react-toastify'
import AuthForm from '../components/AuthForm'
import { motion } from 'framer-motion'
import { BookOpen, Sparkles } from 'lucide-react'

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (data) => {
    try {
      const result = await login(data)
      if (result?.user || result?.access_token) {
        toast.success('Login successful!')
        navigate('/')
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100">
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
      >
        {/* Floating Sparkles */}
        <motion.div
          className="absolute -top-6 -right-6 text-yellow-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles size={60} />
        </motion.div>

        {/* Logo / Icon */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            className="bg-gradient-to-r from-purple-400 to-pink-400 p-4 rounded-full shadow-lg"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <BookOpen size={40} className="text-white" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-4">
            Welcome Back to <span className="text-purple-500">CourseSphere</span>
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Let's continue your learning adventure 🚀
          </p>
        </div>

        {/* Login Form */}
        <AuthForm onSubmit={handleLogin} submitText="Login" />

        {/* Register Link */}
        <motion.p
          className="text-center mt-6 text-gray-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Don’t have an account?{' '}
          <Link
            to="/register"
            className="text-purple-600 font-semibold hover:underline"
          >
            Register here
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

export default LoginPage