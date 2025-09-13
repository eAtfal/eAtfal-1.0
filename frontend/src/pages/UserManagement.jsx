import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { FaPlusCircle, FaEdit, FaTrash, FaSpinner } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { usersAPI } from '../api'

function UserManagement() {
  // eslint-disable-next-line no-console
  console.debug('UserManagement mounted')
  // State for users
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // State for user form
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'STUDENT'
  })

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await usersAPI.getAllUsers()
      setUsers(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load users')
      toast.error(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await usersAPI.createUser(userForm)
      setUsers([...users, response.data])
      toast.success('User created successfully!')
      setShowModal(false)
      resetForm()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await usersAPI.updateUser(editingUser.id, {
        email: userForm.email,
        full_name: userForm.full_name,
        role: userForm.role,
        ...(userForm.password ? { password: userForm.password } : {})
      })
      setUsers(users.map(user => 
        user.id === editingUser.id ? response.data : user
      ))
      toast.success('User updated successfully!')
      setShowModal(false)
      resetForm()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setLoading(true)
    try {
      await usersAPI.deleteUser(userToDelete.id)
      setUsers(users.filter(user => user.id !== userToDelete.id))
      toast.success('User deleted successfully!')
      setShowDeleteConfirm(false)
      setUserToDelete(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setUserForm({
      email: '',
      full_name: '',
      password: '',
      role: 'STUDENT'
    })
    setEditingUser(null)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      password: '', // Don't populate password when editing
      role: user.role
    })
    setShowModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 animate__animated animate__fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">User Management</h1>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md"
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
        >
          <FaPlusCircle />
          <span>Add New User</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {loading && !users.length ? (
        <div className="flex justify-center py-8">
          <FaSpinner className="animate-spin text-blue-600 text-3xl" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Full Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : user.role === 'INSTRUCTOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-blue-600 text-blue-600 rounded-md text-sm hover:bg-blue-50 mr-2"
                      onClick={() => openEditModal(user)}
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-600 text-red-600 rounded-md text-sm hover:bg-red-50"
                      onClick={() => {
                        setUserToDelete(user)
                        setShowDeleteConfirm(true)
                      }}
                    >
                      <FaTrash />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showModal && (
        <Modal onClose={() => {
          setShowModal(false)
          resetForm()
        }}>
          <h2 className="text-xl font-semibold mb-4">{editingUser ? 'Edit User' : 'Create New User'}</h2>
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
            <div className="mb-4">
              <label htmlFor="full_name" className="block mb-1 font-medium">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="full_name"
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block mb-1 font-medium">
                Password {editingUser && '(Leave blank to keep current password)'}
              </label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="role" className="block mb-1 font-medium">Role</label>
              <select
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="role"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                required
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal onClose={() => {
          setShowDeleteConfirm(false)
          setUserToDelete(null)
        }}>
          <h2 className="mb-4">Confirm Delete</h2>
          <p>Are you sure you want to delete user <strong>{userToDelete?.full_name}</strong>?</p>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowDeleteConfirm(false)
                setUserToDelete(null)
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDeleteUser}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default UserManagement
