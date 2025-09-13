import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useEffect, useState } from 'react'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [localUser, setLocalUser] = useState(user)
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setLocalUser(user)
  }, [user])

  useEffect(() => {
    const onAuth = () => {
      try {
        const stored = localStorage.getItem('user')
        const parsed = stored ? JSON.parse(stored) : null
        setLocalUser(parsed)
      } catch (err) {
        // If stored value is malformed, remove it and fallback to null
        console.error('Failed to parse stored user:', err)
        localStorage.removeItem('user')
        setLocalUser(null)
      }
    }
    window.addEventListener('authChanged', onAuth)
    return () => window.removeEventListener('authChanged', onAuth)
  }, [])

  const handleLogout = () => {
    closeNav()
    logout()
    navigate('/login')
  }

  const toggleNav = () => setNavOpen(v => !v)
  const closeNav = () => setNavOpen(false)

  useEffect(() => {
    closeNav()
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeNav()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <nav aria-label="Main navigation" className="fixed top-0 w-full z-50 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white shadow-lg backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo */}
          <Link
            className="flex items-center gap-3 font-bold text-xl tracking-wide hover:scale-105 transition-transform duration-300"
            to="/"
          >
            <span className="inline-flex items-center justify-center bg-white/20 p-2 rounded-xl shadow-md">
              <svg
                className="w-6 h-6 text-yellow-300"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M8 0L1.6 4v8L8 16l6.4-4V4L8 0z" />
              </svg>
            </span>
            <span className="drop-shadow-lg">CourseSphere</span>
          </Link>

          {/* Nav Links */}
          <div className="ml-auto flex items-center gap-3">
            <div id="main-menu" role="menu" aria-hidden={!navOpen} className={`${navOpen ? 'block animate-fadeInDown' : 'hidden'} md:flex md:items-center md:gap-2 absolute md:static top-16 left-0 w-full md:w-auto bg-gradient-to-b md:bg-none from-pink-500/95 via-purple-500/95 to-blue-500/95 md:from-transparent p-4 md:p-0 rounded-b-2xl shadow-lg md:shadow-none`}>
              <NavLink
                className={({ isActive }) => `block px-4 py-2 rounded-full transition transform hover:scale-105 hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ${isActive ? 'bg-white/20 font-semibold' : ''}`}
                to="/courses"
                onClick={closeNav}
                role="menuitem"
              >
                Courses
              </NavLink>

              {localUser && (
                <NavLink
                  className={({ isActive }) => `block px-4 py-2 rounded-full transition transform hover:scale-105 hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ${isActive ? 'bg-white/20 font-semibold' : ''}`}
                  to="/my-courses"
                  onClick={closeNav}
                  role="menuitem"
                >
                  My Courses
                </NavLink>
              )}

              {localUser?.is_admin || String(localUser?.role || '').toUpperCase() === 'ADMIN' ? (
                <NavLink
                  className="block px-4 py-2 rounded-full transition transform hover:scale-105 hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                  to="/admin"
                  onClick={closeNav}
                  role="menuitem"
                >
                  Dashboard
                </NavLink>
              ) : null}

              {/* Mobile-only auth links: visible inside the collapsible menu on small screens */}
              {!localUser ? (
                <>
                  <NavLink className="block px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 md:hidden" to="/login" onClick={closeNav} role="menuitem">
                    Login
                  </NavLink>
                  <NavLink className="block mt-2 px-4 py-2 rounded-full bg-yellow-300 text-purple-700 font-bold shadow-md hover:scale-105 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/60 md:hidden" to="/register" onClick={closeNav} role="menuitem">
                    Register
                  </NavLink>
                </>
              ) : (
                <div className="block mt-2 md:hidden">
                  <div className="px-4 py-2 text-sm">Hi, <span className="font-semibold">{localUser?.name}</span></div>
                  <button className="w-full text-left px-4 py-2 rounded-full bg-white text-purple-600 font-semibold shadow hover:scale-105 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60" onClick={() => { closeNav(); logout(); navigate('/login'); }}>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Auth Buttons: show inline on md+; on small screens they are inside the collapsible menu */}
            {localUser ? (
              <div className="hidden md:flex items-center gap-3 h-16">
                <span className="text-sm leading-tight">Hi, <span className="font-semibold">{localUser?.name}</span></span>
                <button className="px-4 py-2 rounded-full bg-white text-purple-600 font-semibold shadow hover:scale-105 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <NavLink className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40" to="/login" onClick={closeNav}>
                  Login
                </NavLink>
                <NavLink className="px-4 py-2 rounded-full bg-yellow-300 text-purple-700 font-bold shadow-md hover:scale-105 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/60" to="/register" onClick={closeNav}>
                  Register
                </NavLink>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button className="ml-2 md:hidden p-2 rounded-full bg-white/20 hover:bg-white/30 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50" onClick={toggleNav} aria-expanded={navOpen} aria-controls="main-menu" aria-label={navOpen ? 'Close menu' : 'Open menu'}>
              <svg className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {navOpen ? (
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M3 5h14v2H3V5zm0 4h14v2H3V9zm0 4h14v2H3v-2z" clipRule="evenodd" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar