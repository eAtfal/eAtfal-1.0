import { useForm } from 'react-hook-form'

function CourseForm({ isOpen, onClose, onSubmit, initialData, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: initialData || {
      title: '',
      description: '',
      category: '',
      language: 'English',
      level: 'beginner',
      is_published: false
    },
  })

  const handleFormSubmit = (data) => {
    onSubmit(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{initialData ? 'Edit Course' : 'Add Course'}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} id="courseForm" className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Course Title</label>
            <input type="text" id="title" {...register('title', { required: 'Title is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.title ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea id="description" rows="3" {...register('description', { required: 'Description is required', minLength: { value: 10, message: 'Description must be at least 10 characters' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.description ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
              <input id="category" type="text" {...register('category', { required: 'Category is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.category ? 'border-red-500' : 'border-gray-200'}`} />
              {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
              <input id="language" type="text" {...register('language', { required: 'Language is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.language ? 'border-red-500' : 'border-gray-200'}`} />
              {errors.language && <p className="text-sm text-red-600 mt-1">{errors.language.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700">Difficulty Level</label>
              <select id="level" {...register('level', { required: 'Level is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.level ? 'border-red-500' : 'border-gray-200'}`}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              {errors.level && <p className="text-sm text-red-600 mt-1">{errors.level.message}</p>}
            </div>

            <div className="flex items-center">
              <input id="is_published" type="checkbox" {...register('is_published')} className="h-4 w-4 text-blue-600" />
              <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">Publish Course</label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" form="courseForm" disabled={isLoading} className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold">
              {isLoading ? 'Saving...' : initialData ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CourseForm
