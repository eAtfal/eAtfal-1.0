import { Link } from 'react-router-dom'
import { formatDate, truncateText } from '../utils/format'
import { FaStar, FaBook, FaCalendarAlt, FaArrowRight } from 'react-icons/fa'
import { motion } from 'framer-motion'

function CourseCard({ course }) {
  const {
    id,
    title,
    description,
    instructor_name,
    created_at,
    // backend uses average_rating, frontend older code expects rating
    rating = course?.average_rating ?? null,
    total_reviews,
    // backend may call this lesson_count; prefer total items if provided by backend
    total_lessons = course?.total_lessons ?? course?.lesson_count ?? 0,
    total_quizzes = course?.total_quizzes ?? 0,
  } = course || {}

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Link
        to={`/courses/${id}`}
        className="block bg-gradient-to-tr from-pink-50 via-sky-50 to-yellow-50 rounded-xl shadow-md overflow-hidden h-full transition-transform duration-200"
      >
        {/* Fixed-height content area */}
        <div className="p-4 flex flex-col justify-between h-[180px]">
          <div className="space-y-2">
            {/* Title & Description */}
            <div>
              <h5 className="text-lg font-bold text-blue-600 mb-1 line-clamp-1">
                {title}
              </h5>
              <p className="text-gray-600 text-sm line-clamp-2">
                {truncateText(description, 100)}
              </p>
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md text-xs font-medium">
                Instructor
              </span>
              <span className="truncate">{instructor_name}</span>
            </div>
          </div>

          {/* Rating & Lessons */}
          <div className="flex items-center justify-between text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <FaStar className="text-yellow-400" />
              <span className="font-semibold">{rating != null ? Number(rating).toFixed(1) : 'N/A'}</span>
              <small className="text-gray-500">
                ({total_reviews} reviews)
              </small>
            </div>
            <div className="flex items-center gap-2">
              <FaBook />
              <span className="bg-white px-2 py-0.5 rounded-md text-xs text-gray-700">
                {((total_lessons || 0) + (total_quizzes || 0))} items
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-white flex items-center justify-between">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <FaCalendarAlt /> {formatDate(created_at)}
          </div>
          <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-sm text-xs transition-colors">
            <FaArrowRight /> View
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

export default CourseCard