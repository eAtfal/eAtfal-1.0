import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

function ProtectedRoute({ children, requireAdmin = false, requireInstructor = false }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // normalize checks: backend may provide either `is_admin` boolean or a `role` string
  const isAdmin = Boolean(user?.is_admin) || String(user?.role || '').toUpperCase() === 'ADMIN'
  const isInstructor = isAdmin || String(user?.role || '').toUpperCase() === 'INSTRUCTOR'

  if (requireAdmin && !isAdmin) {
    return <div className="max-w-4xl mx-auto px-4 py-4"><h3 className="text-lg font-semibold">403 - Forbidden</h3><p>You do not have access to this page.</p></div>
  }

  if (requireInstructor && !isInstructor) {
    return <div className="max-w-4xl mx-auto px-4 py-4"><h3 className="text-lg font-semibold">403 - Forbidden</h3><p>You do not have access to this page.</p></div>
  }

  return children
}

export default ProtectedRoute
