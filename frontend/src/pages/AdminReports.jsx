import { useEffect, useState } from 'react'
import { reportsAPI } from '../api/reports'

function AdminReports() {
  const [enrollments, setEnrollments] = useState([])
  const [completion, setCompletion] = useState([])
  const [dropoffs, setDropoffs] = useState([])
  const [avgTime, setAvgTime] = useState([])
  const [quizPerf, setQuizPerf] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const [enr, comp, drop, avg, qp, lb] = await Promise.all([
          reportsAPI.enrollments(),
          reportsAPI.completion(),
          reportsAPI.dropoffs(),
          reportsAPI.averageTime(),
          reportsAPI.quizPerformance(),
          reportsAPI.leaderboard(),
        ])
        if (!mounted) return
        setEnrollments(enr.data || [])
        setCompletion(comp.data || [])
        setDropoffs(drop.data || [])
        setAvgTime(avg.data || [])
        setQuizPerf(qp.data || [])
        setLeaderboard(lb.data || [])
      } catch (e) {
        console.error('Failed to load reports', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Reports & Analytics</h1>
      {loading && <p>Loading reports...</p>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Course Enrollment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrollments.map(e => (
            <div key={e.course_id} className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold">{e.title}</h4>
              <p className="text-sm text-gray-600">Enrollments: {e.enrollments}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Completion Rates</h2>
        <div className="space-y-2">
          {completion.map(c => (
            <div key={c.course_id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{c.title}</h4>
                <p className="text-sm text-gray-600">{c.completed} / {c.total_lessons} lessons completed</p>
              </div>
              <div className="text-lg font-semibold">{c.percent_complete}%</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Drop-off Points</h2>
        <div className="space-y-2">
          {dropoffs.map(d => (
            <div key={`${d.course_id}-${d.lesson_id}`} className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold">{d.lesson_title}</h4>
              <p className="text-sm text-gray-600">Course ID: {d.course_id} — Completions: {d.completions}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Average Time (seconds)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {avgTime.map(a => (
            <div key={`${a.scope}-${a.id}`} className="bg-white rounded-lg shadow p-4">
              <h4 className="font-semibold">{a.scope === 'course' ? a.title : `${a.title} (lesson)`}</h4>
              <p className="text-sm text-gray-600">Average: {Math.round(a.avg_seconds)}s</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Quiz Performance</h2>
        <div className="space-y-2">
          {quizPerf.map(q => (
            <div key={q.quiz_id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{q.title}</h4>
                <p className="text-sm text-gray-600">Attempts: {q.attempts}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">Avg: {q.average_score_percent}%</div>
                <div className="text-sm text-gray-600">Pass rate: {q.pass_rate_percent}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
        <div className="bg-white rounded-lg shadow p-4">
          <ol className="list-decimal list-inside">
            {leaderboard.map((p, idx) => (
              <li key={p.user_id} className="py-1">{p.full_name} — {p.points} pts</li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}

export default AdminReports
