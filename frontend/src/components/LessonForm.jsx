import { useForm } from 'react-hook-form'

function LessonForm({ isOpen, onClose, onSubmit, initialData, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: initialData || {
      title: '',
      content: '',
      video_url: '',
      duration_seconds: '',
      is_preview: false,
    },
  })

  const handleFormSubmit = (data) => {
    // Convert minutes to seconds for duration
    if (data.duration_seconds) {
      data.duration_seconds = parseInt(data.duration_seconds) * 60;
    }
    onSubmit(data)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl z-10 overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{initialData ? 'Edit Lesson' : 'Add Lesson'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit(handleFormSubmit)} id="lessonForm" className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Lesson Title</label>
            <input type="text" id="title" {...register('title', { required: 'Title is required' })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.title ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="video_url" className="block text-sm font-medium text-gray-700">YouTube Video URL</label>
            <input type="url" id="video_url" placeholder="https://www.youtube.com/watch?v=..." {...register('video_url', { pattern: { value: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/, message: 'Please enter a valid YouTube URL' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.video_url ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.video_url && <p className="text-sm text-red-600 mt-1">{errors.video_url.message}</p>}
            <div className="text-sm text-gray-500 mt-1">Enter the full YouTube video URL. Leave empty if lesson doesn't have a video.</div>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
            <textarea id="content" rows="5" {...register('content', { required: 'Content is required', minLength: { value: 10, message: 'Content must be at least 10 characters' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.content ? 'border-red-500' : 'border-gray-200'}`} />
            {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="duration_seconds" className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
              <input type="number" id="duration_seconds" {...register('duration_seconds', { min: { value: 1, message: 'Duration must be at least 1 minute' } })} className={`mt-1 block w-full rounded-md border px-3 py-2 ${errors.duration_seconds ? 'border-red-500' : 'border-gray-200'}`} />
              {errors.duration_seconds && <p className="text-sm text-red-600 mt-1">{errors.duration_seconds.message}</p>}
            </div>

            <div className="flex items-center">
              <input id="is_preview" type="checkbox" {...register('is_preview')} className="h-4 w-4 text-blue-600" />
              <label htmlFor="is_preview" className="ml-2 text-sm text-gray-700">Preview Lesson (Free)</label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700">Cancel</button>
            <button type="submit" form="lessonForm" disabled={isLoading} className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold">{isLoading ? 'Saving...' : initialData ? 'Update Lesson' : 'Create Lesson'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LessonForm
