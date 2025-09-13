import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";

export default function QuizResultPopup({
  type = "pass",
  show = false,
  onClose,
  autoCloseMs = 5000,
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    function update() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Auto close + progress bar
  useEffect(() => {
    if (!show) return;

    let start = Date.now();
    let frame;

    function tick() {
      let elapsed = Date.now() - start;
      let pct = Math.max(0, 100 - (elapsed / autoCloseMs) * 100);
      setProgress(pct);
      if (pct > 0) {
        frame = requestAnimationFrame(tick);
      } else {
        handleClose();
      }
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [show, autoCloseMs]);

  function handleClose() {
    onClose && onClose();
  }

  if (!show) return null;

  const isPass = type === "pass";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Confetti only for pass */}
        {isPass && (
          <div className="fixed inset-0 z-40 pointer-events-none">
            <Confetti
              width={size.width}
              height={size.height}
              recycle={false}
              numberOfPieces={300}
              run={true}
            />
          </div>
        )}

        {/* Card */}
        <motion.div
          className={`relative max-w-md w-full rounded-3xl shadow-2xl text-center overflow-hidden
            ${isPass
              ? "bg-gradient-to-br from-green-100 via-yellow-100 to-green-200 border-t-8 border-green-500"
              : "bg-gradient-to-br from-blue-100 via-purple-100 to-blue-200 border-t-8 border-blue-500"}`}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {/* Progress bar */}
          <div
            className={`h-1 ${
              isPass ? "bg-green-500" : "bg-blue-500"
            } transition-all`}
            style={{ width: `${progress}%` }}
          />

          {/* Icon */}
          <div className="mt-6 mb-4 flex justify-center">
            {isPass ? (
              <motion.div
                className="text-6xl"
                initial={{ scale: 0 }}
                animate={{ scale: [1.2, 1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🏆
              </motion.div>
            ) : (
              <motion.div
                className="text-6xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ☁️
              </motion.div>
            )}
          </div>

          {/* Title */}
          <h2
            className={`text-3xl font-extrabold ${
              isPass ? "text-green-700" : "text-blue-700"
            }`}
          >
            {isPass ? "Great Job!" : "Keep Trying!"}
          </h2>

          {/* Message */}
          <p className="mt-2 text-lg text-gray-700 font-medium px-6">
            {isPass
              ? "You passed the quiz successfully 🎉 Keep up the awesome work!"
              : "Almost there! Review the lesson and give it another shot 💪"}
          </p>

          {/* Extra decoration */}
          {isPass ? (
            <div className="absolute -top-4 -right-4 text-4xl animate-pulse">✨</div>
          ) : (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-3xl animate-bounce">
              💧
            </div>
          )}

          {/* Button */}
          <div className="mt-8 mb-6">
            <motion.button
              onClick={handleClose}
              whileTap={{ scale: 0.9 }}
              className={`px-6 py-3 rounded-xl text-white font-bold shadow-lg text-lg
                ${isPass
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-blue-600 hover:bg-blue-700"}`}
            >
              {isPass ? "Continue 🚀" : "Try Again 🔄"}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

