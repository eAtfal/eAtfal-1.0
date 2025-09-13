import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usersAPI } from '../api'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    usersAPI.getAllUsers().then(res => {
      if (!mounted) return
      const data = Array.isArray(res.data) ? res.data : []
      setUsers(data)
    }).catch(() => setUsers([])).finally(() => setLoading(false))
    return () => { mounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading users…</div>
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      {users.length === 0 ? (
        <div className="text-sm text-gray-500">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="p-3 rounded border flex items-center justify-between">
              <div>
                <div className="font-medium">{u.full_name || u.name || u.email}</div>
                <div className="text-sm text-gray-500">{u.email}</div>
              </div>
              <div>
                <button className="px-3 py-1 rounded border" onClick={() => navigate(`/users/${u.id}`)}>View</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
