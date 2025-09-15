import React from "react";
import GlobalLeaderboard from "./GlobalLeaderboard";

export default function LeaderboardPage() {
  return (
    <div className="py-8 px-4 bg-gradient-to-br from-indigo-50 to-pink-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <GlobalLeaderboard mode="live" apiBase="/api/v1" />
      </div>
    </div>
  );
}
