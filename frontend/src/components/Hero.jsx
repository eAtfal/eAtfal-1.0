import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, Gamepad2, Sparkles } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-100 via-yellow-100 to-blue-100 py-16">
      {/* Floating decorative shapes */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 rounded-full bg-blue-300 opacity-40"
        animate={{ y: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-pink-300 opacity-40"
        animate={{ x: [0, 25, 0] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
      />

      <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="text-center lg:text-left">
          <motion.h1
            className="text-5xl lg:text-6xl font-extrabold text-gray-900 drop-shadow-sm"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Welcome to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-pink-600">
              CourseSphere
            </span>
          </motion.h1>

          <motion.p
            className="mt-6 text-gray-700 text-lg max-w-xl mx-auto lg:mx-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Fun, interactive courses made just for kids — with lessons, games, and
            quizzes that make learning an adventure!
          </motion.p>

          <motion.div
            className="flex justify-center lg:justify-start gap-4 mt-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Link
              to="/login"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:scale-105 transition-transform"
            >
              Start Learning
            </Link>
            <Link
              to="/courses"
              className="px-6 py-3 rounded-2xl bg-white text-blue-600 font-semibold shadow-lg border hover:bg-blue-50 transition"
            >
              Explore Courses
            </Link>
          </motion.div>
        </div>

        {/* Right content card */}
        <motion.div
          className="flex justify-center lg:justify-end"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="relative">
            <motion.div
              className="rounded-3xl shadow-xl p-8 bg-white max-w-sm text-center"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <h2 className="font-bold text-2xl text-blue-600 flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Learn • Play • Grow
              </h2>
              <p className="text-gray-600 mt-3">
                Dive into exciting lessons, unlock quizzes, and challenge your mind
                with fun games!
              </p>

              <div className="flex justify-center gap-6 mt-6 text-blue-500">
                <BookOpen className="w-10 h-10" />
                <Gamepad2 className="w-10 h-10" />
                <Sparkles className="w-10 h-10" />
              </div>
            </motion.div>

            {/* Floating glowing orb */}
            <motion.div
              className="absolute bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full blur-2xl"
              style={{
                width: "80px",
                height: "80px",
                top: "-30px",
                right: "-30px",
                opacity: 0.25,
              }}
              animate={{ scale: [1, 1.15, 1], rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}