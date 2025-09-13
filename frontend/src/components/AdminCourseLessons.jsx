import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { coursesAPI, lessonsAPI } from '../api'
import quizAPI from '../api/quiz'
import LessonForm from './LessonForm'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import AdminQuizEditor from './AdminQuizEditor'
import { FaArrowLeft, FaPlusCircle, FaGripVertical, FaEdit, FaTrash, FaSpinner } from 'react-icons/fa'

function AdminCourseLessons() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
  const [lessonToDelete, setLessonToDelete] = useState(null)
  const [quizToDelete, setQuizToDelete] = useState(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: course,
    isLoading: courseLoading,
    error: courseError,
  } = useQuery({
    queryKey: ['admin-course', courseId],
    queryFn: () => coursesAPI.get(courseId).then((res) => res.data),
  })

  const {
    data: lessons,
    isLoading: lessonsLoading,
    error: lessonsError,
  } = useQuery({
    queryKey: ['admin-lessons', courseId],
    queryFn: () => lessonsAPI.getAll(courseId).then((res) => res.data),
  })

  const { data: quizzes, isLoading: quizzesLoading, error: quizzesError } = useQuery({
    queryKey: ['admin-course-quizzes', courseId],
    queryFn: () => quizAPI.getCourseQuizzes(courseId).then((res) => res.data),
    enabled: !!courseId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => lessonsAPI.create(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-lessons', courseId])
      toast.success('Lesson created successfully')
      setShowAddModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error creating lesson')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ lessonId, data }) =>
      lessonsAPI.update(courseId, lessonId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-lessons', courseId])
      toast.success('Lesson updated successfully')
      setEditingLesson(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error updating lesson')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (lessonId) => lessonsAPI.delete(courseId, lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-lessons', courseId])
      toast.success('Lesson deleted successfully')
      setLessonToDelete(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error deleting lesson')
    },
  })

  const deleteQuizMutation = useMutation({
    mutationFn: (quizId) => quizAPI.deleteCourseQuiz ? quizAPI.deleteCourseQuiz(courseId, quizId) : Promise.reject(new Error('Not implemented')),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-course-quizzes', courseId])
      toast.success('Quiz deleted successfully')
      setQuizToDelete(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Error deleting quiz')
    },
  })

  const onDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(lessons)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order in the backend
    // You'll need to implement this API endpoint
    updateLessonOrder(items.map((item, index) => ({
      id: item.id,
      order: index + 1,
    })))
  }

  const handleEdit = (lesson) => {
    setEditingLesson(lesson)
  }

  const handleDelete = (lesson) => {
    setLessonToDelete(lesson)
  }

  const handleCreateSubmit = (data) => {
    createMutation.mutate(data)
  }

  const handleUpdateSubmit = (data) => {
    updateMutation.mutate({ lessonId: editingLesson.id, data })
  }

  const handleDeleteConfirm = () => {
    if (lessonToDelete) {
      deleteMutation.mutate(lessonToDelete.id)
    }
  }

  if (courseLoading || lessonsLoading || quizzesLoading) {
    return (
      <div className="flex justify-center py-8">
        <FaSpinner className="animate-spin text-3xl text-blue-600" />
      </div>
    )
  }

  if (courseError || lessonsError) {
    return (
      <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-md">Error loading course content</div>
    )
  }

  return (
  <div className="max-w-6xl mx-auto px-4 py-4 animate__animated animate__fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md mr-3" onClick={() => navigate('/admin/courses')}>
            <FaArrowLeft />
            <span>Back to Courses</span>
          </button>
          <h1 className="mb-0 text-2xl font-semibold">Manage Lessons: {course.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md" onClick={() => setShowAddModal(true)}>
            <FaPlusCircle />
            <span>Add Lesson</span>
          </button>
          <button
            className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-md"
            onClick={() => navigate(`/admin/courses/${courseId}/quizzes`)}
          >
            <FaPlusCircle />
            <span>Manage Quizzes</span>
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="lessons">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="list-group"
            >
              {lessons.map((lesson, index) => (
                <Draggable
                  key={lesson.id}
                  draggableId={lesson.id.toString()}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="p-3 bg-white rounded-md shadow-sm mb-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="mr-3 text-gray-400"><FaGripVertical /></span>
                          <div>
                            <h5 className="mb-1 font-medium">{lesson.title}</h5>
                            <small className="text-sm text-gray-500">{lesson.duration} minutes</small>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 border rounded-md text-sm text-blue-600" onClick={() => handleEdit(lesson)}>
                            <FaEdit />
                          </button>
                          <button className="px-2 py-1 border rounded-md text-sm text-red-600" onClick={() => handleDelete(lesson)}>
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {/* Render quizzes after lessons so admins can see both lists */}
              {(quizzes || []).map((q) => (
                <div key={`quiz-${q.id}`} className="p-3 bg-white rounded-md shadow-sm mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="mr-3 text-gray-400"><FaGripVertical /></span>
                      <div>
                        <h5 className="mb-1 font-medium">[Quiz] {q.title}</h5>
                        <small className="text-sm text-gray-500">Questions: {q.questions?.length ?? 0}</small>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a className="px-2 py-1 border rounded-md text-sm text-sky-600" href={`/admin/courses/${courseId}/quizzes/${q.id}`}>Manage</a>
                      <button className="px-2 py-1 border rounded-md text-sm text-red-600" onClick={() => setQuizToDelete(q)}>
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add/Edit Lesson Modal */}
      {(showAddModal || editingLesson) && (
        <LessonForm
          isOpen={true}
          onClose={() => {
            setShowAddModal(false)
            setEditingLesson(null)
          }}
          onSubmit={editingLesson ? handleUpdateSubmit : handleCreateSubmit}
          initialData={editingLesson}
          isLoading={editingLesson ? updateMutation.isLoading : createMutation.isLoading}
        />
      )}

      {/* Quiz Modal */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center p-6">
          <div className="w-full max-w-3xl bg-white rounded shadow p-4 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Quiz for {course.title}</h3>
              <button onClick={() => setShowQuizModal(false)} className="text-gray-500">Close</button>
            </div>
            <AdminQuizEditor courseId={courseId} onSuccess={() => { queryClient.invalidateQueries(['admin-course', courseId]); setShowQuizModal(false); }} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!lessonToDelete}
        onClose={() => setLessonToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lesson"
        message={`Are you sure you want to delete "${lessonToDelete?.title}"? This action cannot be undone.`}
        isLoading={deleteMutation.isLoading}
      />
      <DeleteConfirmationModal
        isOpen={!!quizToDelete}
        onClose={() => setQuizToDelete(null)}
        onConfirm={() => { if (quizToDelete) deleteQuizMutation.mutate(quizToDelete.id) }}
        title="Delete Quiz"
        message={`Are you sure you want to delete "${quizToDelete?.title}"? This action cannot be undone.`}
        isLoading={deleteQuizMutation.isLoading}
      />
    </div>
  )
}

export default AdminCourseLessons
