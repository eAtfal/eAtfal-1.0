import { useQuery } from '@tanstack/react-query'
import { coursesAPI } from '../api'
import CourseCard from '../components/CourseCard'
import Hero from '../components/Hero'
import { motion } from 'framer-motion'
import { Sparkles, Search, Filter } from 'lucide-react'

function CourseList() {
  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll().then((res) => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <motion.div
          className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"
          aria-label="Loading courses"
        />
        <p className="text-lg font-medium text-pink-500 animate-pulse">
          Loading fun courses...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="bg-red-100 text-red-700 px-6 py-4 rounded-2xl shadow-md">
          🚨 Oops! Couldn’t load courses: {error.message}
        </div>
      </div>
    )
  }

  return (
    <>
      <Hero />

      <motion.div
        className="max-w-7xl mx-auto px-6 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <motion.h1
            className="text-3xl font-extrabold text-purple-600 flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-7 h-7 text-yellow-400" />
            Explore Exciting Courses
          </motion.h1>

          {/* Search + Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses..."
                className="pl-10 pr-3 py-2 rounded-full border-2 border-purple-200 focus:ring-2 focus:ring-purple-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 bg-white border-2 border-purple-200 px-3 py-2 rounded-full shadow-sm">
              <Filter className="w-4 h-4 text-purple-500" />
              <select className="bg-transparent outline-none">
                <option value="">Sort by...</option>
                <option value="rating">⭐ Highest Rated</option>
                <option value="newest">🆕 Newest First</option>
                <option value="oldest">📚 Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {courses?.length === 0 ? (
          <motion.div
            className="text-center py-10 bg-yellow-50 rounded-2xl shadow-inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h3 className="text-2xl font-bold text-gray-700">
              🚀 No courses available
            </h3>
            <p className="text-gray-500 mt-2">
              Check back soon for more adventures!
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {courses?.map((course) => (
              <motion.div
                key={course.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </>
  )
}

export default CourseList