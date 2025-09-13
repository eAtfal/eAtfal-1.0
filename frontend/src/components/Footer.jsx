import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { 
  FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, 
  FaCreditCard, FaPaypal, FaWallet 
} from 'react-icons/fa'
import { motion } from 'framer-motion'

function Footer() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto relative overflow-hidden bg-gradient-to-r from-pink-100 via-sky-100 to-yellow-100">
      {/* Floating playful shapes */}
      <motion.div
        className="absolute top-8 left-8 w-10 h-10 bg-pink-300 rounded-full opacity-40"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-12 right-12 w-14 h-14 bg-sky-300 rounded-full opacity-40"
        animate={{ y: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      />

  <div className="relative max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand + Social */}
          <div className="md:col-span-4">
            <h5 className="text-2xl font-extrabold text-sky-700 mb-3">CourseSphere</h5>
            <p className="text-gray-700">
              Empowering young learners with fun, interactive, and high-quality courses. 
              Learn, play, and grow together!
            </p>
            <div className="flex items-center gap-4 mt-5 text-sky-700">
              <motion.a whileHover={{ scale: 1.2 }} href="#" aria-label="Facebook" className="p-2 rounded-full bg-white shadow-md">
                <FaFacebookF />
              </motion.a>
              <motion.a whileHover={{ scale: 1.2 }} href="#" aria-label="Twitter" className="p-2 rounded-full bg-white shadow-md">
                <FaTwitter />
              </motion.a>
              <motion.a whileHover={{ scale: 1.2 }} href="#" aria-label="LinkedIn" className="p-2 rounded-full bg-white shadow-md">
                <FaLinkedinIn />
              </motion.a>
              <motion.a whileHover={{ scale: 1.2 }} href="#" aria-label="Instagram" className="p-2 rounded-full bg-white shadow-md">
                <FaInstagram />
              </motion.a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h5 className="mb-3 font-bold text-sky-800">Quick Links</h5>
            <ul className="space-y-2 text-gray-700">
              <li><Link to="/courses" className="hover:text-pink-600 transition-colors">Browse Courses</Link></li>
              {user && (
                <li><Link to="/my-courses" className="hover:text-pink-600 transition-colors">My Learning</Link></li>
              )}
              <li><a href="#" className="hover:text-pink-600 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-pink-600 transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-2">
            <h5 className="mb-3 font-bold text-sky-800">Support</h5>
            <ul className="space-y-2 text-gray-700">
              <li><a href="#" className="hover:text-pink-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-pink-600 transition-colors">FAQs</a></li>
              <li><a href="#" className="hover:text-pink-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-pink-600 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="md:col-span-4">
            <h5 className="mb-3 font-bold text-sky-800">Stay Updated</h5>
            <p className="text-gray-700">Get fun learning tips and updates delivered to your inbox!</p>
            <form className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                aria-label="Email for newsletter"
                className="flex-1 rounded-xl border px-4 py-2 shadow-sm focus:ring-2 focus:ring-sky-400 focus:outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 font-semibold shadow-md transition"
              >
                Subscribe
              </motion.button>
            </form>
          </div>
        </div>

        {/* Bottom section */}
        <div className="border-t mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-gray-700">
          <div className="text-center md:text-left">
            © {currentYear} <span className="font-bold text-sky-700">CourseSphere</span>. All rights reserved.
          </div>
          <div className="flex items-center gap-6 mt-4 md:mt-0 text-sky-700 text-xl">
            <FaCreditCard />
            <FaPaypal />
            <FaWallet />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer