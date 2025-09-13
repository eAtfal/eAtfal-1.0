import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

function AdminDashboard() {
  const navigate = useNavigate()



  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate__animated animate__fadeIn">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onClick={() => navigate('/admin/courses')} className="bg-white rounded-lg shadow p-6 cursor-pointer text-center">
          <div className="text-3xl text-blue-600 mb-3">📚</div>
          <h5 className="font-semibold">Manage Courses</h5>
          <p className="text-gray-600">Create, edit, and organize courses.</p>
        </div>

        <div onClick={() => navigate('/admin/users')} className="bg-white rounded-lg shadow p-6 cursor-pointer text-center">
          <div className="text-3xl text-green-600 mb-3">👥</div>
          <h5 className="font-semibold">Manage Users</h5>
          <p className="text-gray-600">View, create, update, and delete users.</p>
        </div>

        <div onClick={() => navigate('/admin/reports')} className="bg-white rounded-lg shadow p-6 cursor-pointer text-center">
          <div className="text-3xl text-sky-600 mb-3">📈</div>
          <h5 className="font-semibold">Reports & Analytics</h5>
          <p className="text-gray-600">Track platform performance and user activity.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
