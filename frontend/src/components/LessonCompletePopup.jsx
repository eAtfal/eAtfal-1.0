import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

/**
 * LessonCompletePopup
 * Big, Fun, Interactive Popup for Kids
 */
export default function LessonCompletePopup({
  show: controlledShow,
  onClose,
  title = "Awesome Job!",
  message = "You completed the lesson 🎉",
  autoCloseMs = 10000,
}) {
  const [internalShow, setInternalShow] = useState(true);
  const show = typeof controlledShow === "boolean" ? controlledShow : internalShow;

  // Window size for Confetti
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    function update() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Auto-close AFTER animation delay
  useEffect(() => {
    if (!show) return;
    if (autoCloseMs > 0) {
      const animationDelay = 2500; // keep popup for full 10s after showing
      const t = setTimeout(() => handleClose(), autoCloseMs + animationDelay);
      return () => clearTimeout(t);
    }
  }, [show, autoCloseMs]);

  // Escape key closes
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") handleClose();
    }
    if (show) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  function handleClose() {
    if (typeof controlledShow === "boolean") {
      onClose && onClose();
    } else {
      setInternalShow(false);
      onClose && onClose();
    }
  }

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 m-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Confetti */}
        <Confetti width={size.width} height={size.height} recycle={false} run={true} />

        {/* Popup Card */}
        <motion.div
          className="relative bg-gradient-to-br from-yellow-100 via-pink-100 to-purple-100 max-w-2xl w-full rounded-3xl shadow-2xl text-center p-10 border-4 border-yellow-300"
          initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Celebration Emoji */}
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.6 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-4xl font-extrabold text-purple-700 drop-shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            {title}
          </motion.h2>

          {/* Message */}
          <motion.p
            className="mt-4 text-xl text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>

          {/* Cute stars / emojis */}
          <div className="absolute -top-6 -right-6 text-5xl animate-bounce">✨</div>
          <div className="absolute -top-6 -left-6 text-5xl animate-bounce">🌟</div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-5xl animate-bounce">
            🎉
          </div>

          {/* Buttons */}
          <motion.div
            className="mt-8 flex justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl text-lg font-bold shadow-lg hover:scale-105 transform transition"
            >
              Continue 🚀
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-600 font-semibold hover:bg-gray-100"
            >
              Dismiss
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}