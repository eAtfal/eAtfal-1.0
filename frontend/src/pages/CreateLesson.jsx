import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { toast } from 'react-toastify'

function CreateLesson() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [isPreview, setIsPreview] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        title,
        content,
        video_url: videoUrl,
        duration_seconds: duration ? parseInt(duration, 10) : null,
        is_preview: isPreview
      }
      const res = await lessonsAPI.create(courseId, payload)
      toast.success('Lesson created')
  // Redirect to the newly created lesson using the learn route
  navigate(`/courses/${courseId}/learn/${res.data.id}`)
    } catch (err) {
      console.error('Create lesson error', err)
      toast.error(err.response?.data?.detail || 'Failed to create lesson')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate__animated animate__fadeIn">
      <h2 className="text-xl font-semibold mb-4">Create Lesson</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input className="mt-1 block w-full rounded-md border px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Content</label>
          <textarea className="mt-1 block w-full rounded-md border px-3 py-2" value={content} onChange={e => setContent(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Video URL</label>
          <input className="mt-1 block w-full rounded-md border px-3 py-2" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Duration (seconds)</label>
          <input type="number" className="mt-1 block w-full rounded-md border px-3 py-2" value={duration} onChange={e => setDuration(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <input className="h-4 w-4" type="checkbox" checked={isPreview} id="isPreview" onChange={e => setIsPreview(e.target.checked)} />
          <label className="text-sm">Is Preview</label>
        </div>
        <div>
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white" type="submit">Create Lesson</button>
        </div>
      </form>
    </div>
  )
}

export default CreateLesson
