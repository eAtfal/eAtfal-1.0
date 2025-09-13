import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usersAPI } from '../api'

export default function UserProfile() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    usersAPI.getAllUsers().then(res => {
      if (!mounted) return
      const data = Array.isArray(res.data) ? res.data : []
      const found = data.find(u => String(u.id) === String(id))
      setUser(found || null)
    }).catch(() => setUser(null)).finally(() => setLoading(false))
    return () => { mounted = false }
  }, [id])

  if (loading) return <div className="p-6">Loading…</div>
  if (!user) return <div className="p-6">User not found</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">{user.full_name || user.name || user.email}</h2>
      <div className="text-sm text-gray-600 mb-4">Role: {String(user.role).toUpperCase()}</div>
      <div className="space-y-2">
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Joined:</strong> {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</div>
      </div>
    </div>
  )
}
