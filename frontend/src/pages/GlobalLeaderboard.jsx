import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useAuth } from "../hooks/useAuth.jsx";
import scrollToTop from "../utils/scrollToTop";

export default function Leaderboard({ apiBase = "" }) {
  const [players, setPlayers] = useState([]);
  const [confettiOn, setConfettiOn] = useState(false);
  const { user } = useAuth();
  const rowRefs = useRef({});

  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      try {
        const res = await fetch(`${apiBase}/leaderboard/global`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setPlayers(computeRanked(data));
        setConfettiOn(true);
        setTimeout(() => setConfettiOn(false), 5000);
      } catch (err) {
        console.error(err);
      }
    }

    fetchOnce();
    const poll = setInterval(fetchOnce, 8000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [apiBase]);

  function computeRanked(list) {
    const sorted = [...list].sort(
      (a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname)
    );
    return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
  }

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  const isUser = (id) => user && user.id === id;

  useEffect(() => {
    if (!user) return;
    const el = rowRefs.current?.[user.id];
    if (el && typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {
        /* ignore */
      }
    }
  }, [players, user]);

  // Ensure page starts at top when navigating to leaderboard (reusable)
  useEffect(() => scrollToTop({ behavior: "auto", focusSelector: "h2" }), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-200 via-purple-100 to-pink-200 p-6">
      <h2 className="text-4xl font-bold text-center text-purple-800 mb-10 drop-shadow-lg">
        🎉 Super Star Leaderboard 🎉
      </h2>

      {/* Podium Section */}
      <div className="flex justify-center items-end gap-4 mb-12">
        {/* 2nd Place */}
        {top3[1] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center w-36"
          >
            <div className="flex flex-col items-center text-center mb-2">
              <span className="text-xl">{top3[1].avatar}</span>
              <span
                className="font-bold text-purple-700 text-sm truncate whitespace-nowrap overflow-hidden w-36 text-center"
                title={top3[1].nickname}
              >
                {top3[1].nickname}
              </span>
            </div>
            <div className="text-3xl mb-2">🥈</div>
            <div className="bg-gradient-to-t from-gray-300 to-gray-100 w-full h-36 rounded-t-xl shadow-lg flex items-center justify-center text-2xl font-bold text-purple-800">
              {top3[1].points}
            </div>
            <div className="bg-gray-400 w-full h-6 rounded-b-md shadow"></div>
          </motion.div>
        )}

        {/* 1st Place */}
        {top3[0] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center w-40"
          >
            <div className="flex flex-col items-center text-center mb-2">
              <span className="text-2xl">{top3[0].avatar}</span>
              <span
                className="font-bold text-yellow-800 text-base truncate whitespace-nowrap overflow-hidden w-44 text-center"
                title={top3[0].nickname}
              >
                {top3[0].nickname}
              </span>
            </div>
            <div className="text-4xl mb-2">🥇</div>
            <div className="bg-gradient-to-t from-yellow-400 to-yellow-200 w-full h-48 rounded-t-xl shadow-xl flex items-center justify-center text-3xl font-bold text-yellow-900">
              {top3[0].points}
            </div>
            <div className="bg-yellow-500 w-full h-6 rounded-b-md shadow"></div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="flex flex-col items-center w-36"
          >
            <div className="flex flex-col items-center text-center mb-2">
              <span className="text-xl">{top3[2].avatar}</span>
              <span
                className="font-bold text-orange-700 text-sm truncate whitespace-nowrap overflow-hidden w-32 text-center"
                title={top3[2].nickname}
              >
                {top3[2].nickname}
              </span>
            </div>
            <div className="text-3xl mb-2">🥉</div>
            <div className="bg-gradient-to-t from-orange-300 to-orange-100 w-full h-28 rounded-t-xl shadow-lg flex items-center justify-center text-2xl font-bold text-orange-800">
              {top3[2].points}
            </div>
            <div className="bg-orange-400 w-full h-6 rounded-b-md shadow"></div>
          </motion.div>
        )}
      </div>

      {/* Rest of Leaderboard */}
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-lg max-h-80 overflow-y-auto">
        <div className="px-6 py-4 bg-purple-100 bg-opacity-80 rounded-t-2xl sticky top-0">
          <div className="grid grid-cols-12 gap-4 text-sm font-bold text-purple-800">
            <div className="col-span-2">Rank</div>
            <div className="col-span-6">Super Hero</div>
            <div className="col-span-4 text-right">Stars</div>
          </div>
        </div>
        <div className="p-4">
          <AnimatePresence>
            {rest.map((p) => {
              const isCurrent = isUser(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className={
                    "py-3 px-4 grid grid-cols-12 gap-4 items-center rounded-lg hover:bg-purple-50 " +
                    (isCurrent
                      ? "bg-indigo-50 border-l-4 border-indigo-400 shadow-sm"
                      : "")
                  }
                  ref={(el) => (rowRefs.current[p.id] = el)}
                >
                  <div className="col-span-2 text-lg font-bold text-purple-700">
                    {p.rank}
                  </div>
                  <div className="col-span-6 flex items-center gap-2 text-sm text-purple-800">
                    <span className="text-xl">{p.avatar}</span>
                    <span
                      className={
                        "font-semibold " +
                        (isCurrent ? "text-indigo-800" : "")
                      }
                    >
                      {p.nickname}
                    </span>
                  </div>
                  <div className="col-span-4 text-right text-lg font-bold text-purple-700">
                    {p.points}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {confettiOn && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <Confetti
            recycle={false}
            numberOfPieces={500}
            colors={["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEEAD"]}
          />
        </div>
      )}
    </div>
  );
}