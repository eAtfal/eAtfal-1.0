import { useState, useEffect } from 'react'
import { usersAPI } from '../api'
import Modal from '../components/Modal'
import { FaPlus, FaPencilAlt, FaTrash, FaSyncAlt, FaSpinner } from 'react-icons/fa'
import { toast } from 'react-toastify'

function AdminUsers() {
  const [users, setUsers] = useState([])
  const [userForm, setUserForm] = useState({ email: '', full_name: '', password: '', role: 'STUDENT' })
  const [editingUserId, setEditingUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
  const res = await usersAPI.getAllUsers()
  // usersAPI returns an axios response; extract the array safely
  const data = res?.data ?? res
  setUsers(Array.isArray(data) ? data : [])
  setError(null)
    } catch (err) {
  const msg = err.response?.data?.detail || err.message || 'Failed to load users'
  setError(msg)
  toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
  // (debug logs removed)
    setLoading(true)
    try {
  // Normalize role to lowercase expected by backend
  const payload = { ...userForm, role: String(userForm.role).toLowerCase() }
  const res = await usersAPI.createUser(payload)
      toast.success('User created')
      setUserForm({ email: '', full_name: '', password: '', role: 'STUDENT' })
      setShowModal(false)
      // append new user if response contains created user
  const created = res?.data ?? null
      if (created) setUsers((s) => [created, ...s])
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create user'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
  // (debug logs removed)
    setLoading(true)
    try {
      const res = await usersAPI.updateUser(editingUserId, {
        email: userForm.email,
        full_name: userForm.full_name,
        role: String(userForm.role).toLowerCase()
      })
      const updated = res?.data ?? null
      if (updated) setUsers((s) => s.map(u => u.id === updated.id ? updated : u))
      toast.success('User updated')
      setUserForm({ email: '', full_name: '', password: '', role: 'STUDENT' })
      setEditingUserId(null)
      setShowModal(false)
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update user'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id) => {
  // (debug logs removed)
    setLoading(true)
    try {
  await usersAPI.deleteUser(id)
      toast.success('User deleted')
      setConfirmDelete(null)
      // remove locally to feel responsive
      setUsers((s) => s.filter(u => u.id !== id))
      fetchUsers()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete user'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (user) => {
  // (debug logs removed)
    setUserForm({
      email: user.email,
      full_name: user.full_name,
  role: String(user.role).toUpperCase(),
      password: ''
    })
    setEditingUserId(user.id)
    setShowModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => fetchUsers()}
            disabled={loading}
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />}
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md"
            onClick={() => { setUserForm({ email: '', full_name: '', password: '', role: 'STUDENT' }); setEditingUserId(null); setShowModal(true) }}
          >
            <FaPlus /> Add New User
          </button>
        </div>
      </div>

  {error && <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-md mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Full Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Created</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {users.length === 0 && !loading ? (
              <tr>
                <td colSpan="5" className="text-center py-8">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${String(user.role).toUpperCase() === 'ADMIN' ? 'bg-red-100 text-red-800' : String(user.role).toUpperCase() === 'INSTRUCTOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {String(user.role).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">{user.created_at ? new Date(user.created_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="inline-flex items-center px-2 py-1 border rounded-md text-sm text-blue-600 mr-2" onClick={() => openEditModal(user)} disabled={loading}>
                      <FaPencilAlt />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-2 py-1 border rounded-md text-sm text-red-600"
                      onClick={() => setConfirmDelete(user)}
                      disabled={loading || Number(user.id) === Number(JSON.parse(localStorage.getItem('user') || 'null')?.id)}
                      title={Number(user.id) === Number(JSON.parse(localStorage.getItem('user') || 'null')?.id) ? 'Cannot delete current user' : 'Delete user'}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit User Modal */}
  {/* debug logs removed */}
      {showModal && (
  <Modal onClose={() => { setShowModal(false) }}>
          <h5 className="text-lg font-semibold mb-3">{editingUserId ? 'Edit User' : 'Create New User'}</h5>
          <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser}>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
            </div>
            {!editingUserId && (
              <div className="mb-4">
                <label className="block mb-1 font-medium">Password</label>
                <input
                  type="password"
                  className="w-full border rounded-md px-3 py-2"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="mb-4">
              <label className="block mb-1 font-medium">Role</label>
              <select className="w-full border rounded-md px-3 py-2" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setShowModal(false)} disabled={loading}>Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md" disabled={loading}>{loading ? 'Saving...' : (editingUserId ? 'Update' : 'Create')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h5 className="mb-3">Confirm Delete</h5>
          <p>Are you sure you want to delete user <strong>{confirmDelete.full_name}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 bg-gray-200 rounded-md" onClick={() => setConfirmDelete(null)} disabled={loading}>Cancel</button>
            <button type="button" className="px-4 py-2 bg-red-600 text-white rounded-md" onClick={() => handleDeleteUser(confirmDelete.id)} disabled={loading}>{loading ? 'Deleting...' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminUsers
// hmr-trigger: touched to force reload
