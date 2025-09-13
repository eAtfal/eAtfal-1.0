import { createContext, useContext, useState, useEffect } from 'react'
const DEBUG = false
import { authAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
  if (DEBUG) console.debug('AuthProvider init, token present?', Boolean(token), 'storedUser?', Boolean(storedUser))

    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser)
  if (DEBUG) console.debug('AuthProvider parsed stored user on init', parsed)
        setUser(parsed)
        checkAuthStatus()
      } catch (err) {
        console.warn('Invalid user in localStorage, clearing it.', err)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  // Keep provider in sync with storage/auth events (covers cross-tab and direct localStorage edits)
  useEffect(() => {
    const onAuthChanged = () => {
      try {
        const stored = localStorage.getItem('user')
        const parsed = stored ? JSON.parse(stored) : null
  if (DEBUG) console.debug('AuthProvider onAuthChanged parsed', parsed)
        setUser(parsed)
      } catch (e) {
        console.warn('Failed to parse user from localStorage on authChanged/storage', e)
        setUser(null)
      }
    }

    window.addEventListener('authChanged', onAuthChanged)
    window.addEventListener('storage', onAuthChanged)
    return () => {
      window.removeEventListener('authChanged', onAuthChanged)
      window.removeEventListener('storage', onAuthChanged)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Try to fetch authenticated user
      const { data } = await authAPI.me()
      const userObj = data?.user ?? data
      // Ensure we have a consistent user object structure
      const normalizedUser = {
        id: userObj.id,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role,
        is_admin: userObj.is_admin,
      }
      setUser(normalizedUser)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      if (DEBUG) console.debug('checkAuthStatus updated user and localStorage', normalizedUser)
      try {
        window.dispatchEvent(new Event('authChanged'))
        if (DEBUG) console.debug('dispatched authChanged from checkAuthStatus')
      } catch (e) {
        /* noop */
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const { data } = await authAPI.login(credentials)
  if (DEBUG) console.debug('Login response:', data)

      const token = data.access_token ?? data.token
      if (!token) {
        throw new Error('No token received from server')
      }
      localStorage.setItem('token', token)

      const userObj = data.user ?? data
      if (!userObj) {
        throw new Error('No user data received from server')
      }
      const normalizedUser = {
        id: userObj.id,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role,
        is_admin: userObj.is_admin,
      }
      setUser(normalizedUser)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      if (DEBUG) console.debug('login() set user and localStorage', normalizedUser)
      try {
        window.dispatchEvent(new Event('authChanged'))
        if (DEBUG) console.debug('dispatched authChanged from login')
      } catch (e) {
        /* noop */
      }
      return data
    } catch (error) {
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const { data } = await authAPI.register(userData)
      localStorage.setItem('token', data.access_token ?? data.token)

      const userObj = data.user ?? data
      const normalizedUser = {
        id: userObj.id,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role,
        is_admin: userObj.is_admin,
      }
      setUser(normalizedUser)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      if (DEBUG) console.debug('register() set user and localStorage', normalizedUser)
      try {
        window.dispatchEvent(new Event('authChanged'))
        if (DEBUG) console.debug('dispatched authChanged from register')
      } catch (e) {
        /* noop */
      }
      return data
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    try {
      window.dispatchEvent(new Event('authChanged'))
      if (DEBUG) console.debug('dispatched authChanged from logout')
    } catch (e) {
      /* noop */
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}