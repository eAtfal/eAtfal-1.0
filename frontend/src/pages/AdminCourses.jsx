import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { coursesAPI } from '../api'
import CourseForm from '../components/CourseForm'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'

function AdminCourses() {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [courseToDelete, setCourseToDelete] = useState(null)
  const queryClient = useQueryClient()

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => coursesAPI.getAll().then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => coursesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courses'])
      toast.success('Course created successfully')
      setShowAddModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error creating course')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => coursesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courses'])
      toast.success('Course updated successfully')
      setEditingCourse(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error updating course')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => coursesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-courses'])
      toast.success('Course deleted successfully')
      setCourseToDelete(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error deleting course')
    },
  })

  const handleEdit = (course) => {
    setEditingCourse(course)
  }

  const handleDelete = (course) => {
    setCourseToDelete(course)
  }

  const handleCreateSubmit = (data) => {
    createMutation.mutate(data)
  }

  const handleUpdateSubmit = (data) => {
    updateMutation.mutate({ id: editingCourse.id, data })
  }

  const handleDeleteConfirm = () => {
    if (courseToDelete) {
      deleteMutation.mutate(courseToDelete.id)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading courses
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate__animated animate__fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Manage Courses</h1>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md">+ Add Course</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(courses || []).map((course) => (
          <div key={course?.id} className="bg-white rounded-lg shadow p-4 h-full">
            <div className="flex items-start justify-between mb-2">
              <h5 className="text-lg font-medium">{course?.title}</h5>
              <span className={`px-2 py-1 rounded-md text-sm ${course?.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{course?.is_published ? 'Published' : 'Draft'}</span>
            </div>
            <p className="text-gray-600 mb-4">{course?.description}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-sm">{(course?.level || '').charAt(0).toUpperCase() + (course?.level || '').slice(1)}</span>
                <span className="px-2 py-1 bg-sky-50 text-sky-600 rounded-md text-sm">{course?.language}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/admin/courses/${course?.id}/lessons`)} title="Manage Lessons" className="px-2 py-1 rounded-md border hover:bg-gray-50">Manage</button>
                <button onClick={() => handleEdit(course)} title="Edit Course" className="px-2 py-1 rounded-md border hover:bg-gray-50">Edit</button>
                <button onClick={() => handleDelete(course)} title="Delete Course" className="px-2 py-1 rounded-md bg-red-50 text-red-600">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Course Modal */}
      {(showAddModal || editingCourse) && (
        <CourseForm
          isOpen={true}
          onClose={() => {
            setShowAddModal(false)
            setEditingCourse(null)
          }}
          onSubmit={editingCourse ? handleUpdateSubmit : handleCreateSubmit}
          initialData={editingCourse}
          isLoading={editingCourse ? updateMutation.isLoading : createMutation.isLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!courseToDelete}
        onClose={() => setCourseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This action cannot be undone.`}
        isLoading={deleteMutation.isLoading}
      />
    </div>
  )
}

export default AdminCourses
