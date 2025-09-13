import { useState } from 'react'
import { useForm } from 'react-hook-form'

function AuthForm({ onSubmit, submitText, isRegister = false }) {
  const [isLoading, setIsLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const handleFormSubmit = async (data) => {
    setIsLoading(true)
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Auth error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="auth-form bg-white p-6 rounded-lg shadow-sm">
      {isRegister && (
        <div className="mb-4">
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" id="full_name" {...register('full_name', { required: 'Name is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.full_name ? 'border-red-500' : 'border-gray-200'}`} />
          {errors.full_name && <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <input type="email" id="email" {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.email ? 'border-red-500' : 'border-gray-200'}`} />
        {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
        <input type="password" id="password" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.password ? 'border-red-500' : 'border-gray-200'}`} />
        {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
      </div>

      <button type="submit" className="w-full px-4 py-2 rounded-md bg-blue-600 text-white font-semibold" disabled={isLoading}>
        {isLoading ? 'Loading...' : submitText}
      </button>
    </form>
  )
}

export default AuthForm
