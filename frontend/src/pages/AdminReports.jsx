import React, { useEffect, useMemo, useState } from 'react'
import { reportsAPI } from '../api/reports'
import ProgressBar from '../components/ProgressBar'
import ReportCard from '../components/ReportCard'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { RefreshCw, Download } from 'lucide-react'
import { coursesAPI } from '../api'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed']

const fmtNumber = n => (typeof n === 'number' ? n.toLocaleString() : n)
const fmtTime = s => {
  if (typeof s !== 'number') return s
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${sec}s`
}

export default function AdminReports() {
  const [enrollments, setEnrollments] = useState([])
  const [completion, setCompletion] = useState([])
  const [dropoffs, setDropoffs] = useState([])
  const [avgTime, setAvgTime] = useState([])
  const [quizPerf, setQuizPerf] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [coursesMap, setCoursesMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        try {
          const cr = await coursesAPI.getAll()
          const map = {}
            ; (cr?.data || cr || []).forEach(c => { map[c.id ?? c.course_id] = c.title || c.name || `Course ${c.id ?? c.course_id}` })
          setCoursesMap(map)
        } catch (e) {
          // non-fatal
        }
        const params = dateRange.start && dateRange.end ? { start: dateRange.start, end: dateRange.end } : {}
        const [enr, comp, drop, avg, qp, lb] = await Promise.all([
          reportsAPI.enrollments(params),
          reportsAPI.completion(params),
          reportsAPI.dropoffs(params),
          reportsAPI.averageTime(params),
          reportsAPI.quizPerformance(params),
          reportsAPI.leaderboard(params),
        ])
        if (!mounted) return

        const normalizeEnroll = (list) => (Array.isArray(list) ? list.map(i => ({ course_id: i.course_id ?? i.id ?? null, title: i.title ?? '', enrollments: (i.enrollments ?? i.count) ?? 0 })) : [])
        const normalizeCompletion = (list) => (Array.isArray(list) ? list.map(i => {
          const raw = (i.percent_complete ?? i.percentComplete ?? 0)
          let pct = typeof raw === 'number' ? raw : parseFloat(raw) || 0
          if (pct > 0 && pct <= 1) pct = pct * 100
          pct = Math.min(100, Math.max(0, Math.round(pct * 100) / 100))
          return ({ course_id: i.course_id ?? i.courseId ?? i.id ?? null, title: i.title ?? '', total_lessons: (i.total_lessons ?? i.totalLessons ?? i.total) ?? 0, completed: (i.completed ?? i.completed_count) ?? 0, percent_complete: pct })
        }) : [])
        const normalizeDrop = (list) => (Array.isArray(list) ? list.map(i => {
          // support both lessons and quizzes in drop-off data
          const course_id = i.course_id ?? i.courseId ?? i.course ?? null
          if (i.quiz_id ?? i.quizId ?? i.type === 'quiz') {
            return {
              type: 'quiz',
              course_id,
              item_id: i.quiz_id ?? i.quizId ?? i.id ?? null,
              title: i.title ?? i.quiz_title ?? i.name ?? '',
              completions: (i.completions ?? i.count) ?? 0,
            }
          }
          return {
            type: 'lesson',
            course_id,
            item_id: i.lesson_id ?? i.id ?? i.lessonId ?? null,
            title: i.lesson_title ?? i.title ?? '',
            completions: (i.completions ?? i.count) ?? 0,
          }
        }) : [])
        const normalizeAvg = (list) => (Array.isArray(list) ? list.map(i => ({ scope: i.scope ?? (i.course_id ? 'lesson' : 'course'), id: i.id ?? i.lesson_id ?? i.course_id ?? null, title: i.title ?? '', course_id: i.course_id ?? i.courseId ?? null, avg_seconds: (i.avg_seconds ?? i.average_time ?? i.duration_seconds ?? i.avgSeconds) ?? 0 })) : [])
        const normalizeQuiz = (list) => (Array.isArray(list) ? list.map(i => ({ quiz_id: i.quiz_id ?? i.id ?? null, course_id: i.course_id ?? i.courseId ?? null, title: i.title ?? '', average_score_percent: (i.average_score_percent ?? i.avg_pct ?? i.average_score) ?? 0, attempts: (i.attempts ?? i.count) ?? 0, pass_rate_percent: (i.pass_rate_percent ?? i.pass_rate) ?? 0 })) : [])
        const normalizeLeaderboard = (list) => (Array.isArray(list) ? list.map(i => ({ user_id: i.user_id ?? i.id ?? null, full_name: (i.full_name ?? i.name ?? i.fullName) ?? '', points: (i.points ?? i.score) ?? 0 })) : [])

        setEnrollments(normalizeEnroll(enr?.data || enr || []))
        setCompletion(normalizeCompletion(comp?.data || comp || []))
        setDropoffs(normalizeDrop(drop?.data || drop || []))
        setAvgTime(normalizeAvg(avg?.data || avg || []))
        setQuizPerf(normalizeQuiz(qp?.data || qp || []))
        setLeaderboard(normalizeLeaderboard(lb?.data || lb || []))
      } catch (e) {
        console.error('Failed to load reports', e)
        setError(e?.message || 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [dateRange])

  const totalEnrollments = useMemo(() => enrollments.reduce((s, e) => s + (e.enrollments || 0), 0), [enrollments])
  const avgCompletionPercent = useMemo(() => {
    if (!completion.length) return 0
    const sum = completion.reduce((s, c) => s + (c.percent_complete || 0), 0)
    const val = Math.round(sum / completion.length)
    return Math.min(100, Math.max(0, val))
  }, [completion])
  const totalAvgTime = useMemo(() => {
    if (!avgTime.length) return 0
    const sum = avgTime.reduce((s, a) => s + (a.avg_seconds || 0), 0)
    return Math.round(sum / avgTime.length)
  }, [avgTime])

  const avgQuizOverall = useMemo(() => {
    if (!quizPerf.length) return 0
    const sum = quizPerf.reduce((s, q) => s + (q.average_score_percent || 0), 0)
    return Math.round(sum / quizPerf.length)
  }, [quizPerf])

  const handleRefresh = () => {
    setDateRange({ start: '', end: '' })
  }

  const csvData = useMemo(() => {
    const csvEnroll = enrollments.map(e => ({ course_id: e.course_id, title: e.title, enrollments: e.enrollments }))
    const csvCompletion = completion.map(c => ({ course_id: c.course_id, title: c.title, total_lessons: c.total_lessons, completed: c.completed, percent_complete: c.percent_complete }))
  const csvDrop = dropoffs.map(d => ({ course_id: d.course_id, type: d.type || 'lesson', item_id: d.item_id ?? d.lesson_id, title: d.title ?? d.lesson_title, completions: d.completions }))
    const csvAvg = avgTime.map(a => ({ scope: a.scope, id: a.id, title: a.title, course_id: a.course_id, avg_seconds: a.avg_seconds }))
    const csvQuiz = quizPerf.map(q => ({ quiz_id: q.quiz_id, title: q.title, average_score_percent: q.average_score_percent, attempts: q.attempts, pass_rate_percent: q.pass_rate_percent }))
    const csvLb = leaderboard.map(l => ({ user_id: l.user_id, full_name: l.full_name, points: l.points }))
    return { enrollments: csvEnroll, completion: csvCompletion, dropoffs: csvDrop, avgTime: csvAvg, quizPerf: csvQuiz, leaderboard: csvLb }
  }, [enrollments, completion, dropoffs, avgTime, quizPerf, leaderboard])

  if (loading) return <div className="flex justify-center items-center h-screen"><ProgressBar indeterminate /></div>
  if (error) return <p className="text-red-600 text-center mt-10">Error: {error}</p>

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-10 bg-gray-50 min-h-screen">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics Dashboard</h1>
        <div className="flex space-x-4">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="border rounded px-2 py-1"
          />
          <button onClick={handleRefresh} className="flex items-center bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
            <RefreshCw size={16} className="mr-1" /> Refresh
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(csvData, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'reports.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            <Download size={16} className="mr-1" /> Export
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard title="Total Enrollments" subtitle={fmtNumber(totalEnrollments)} icon="📈" />
        <ReportCard title="Avg Completion" subtitle={`${avgCompletionPercent}%`} icon="🏆" />
        <ReportCard title="Avg Time Spent" subtitle={fmtTime(totalAvgTime)} icon="⏱️" />
        <ReportCard title="Courses" subtitle={fmtNumber(Object.keys(coursesMap).length)} icon="📚" />
        <ReportCard title="Quizzes" subtitle={fmtNumber(quizPerf.length)} icon="❓" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trends */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-4 border-b">Enrollment Trends</h2>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="enrollments" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Completion Rates */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-4 border-b">Completion Rates</h2>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="percent_complete" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Drop-off Points */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-4 border-b">Drop-off Points</h2>
          <div className="p-4 h-96">
            <div className="space-y-6 overflow-auto h-full">
              {Object.entries(
                // merge dropoff items with quizzes (use attempts as completions)
                ([...dropoffs, ...quizPerf.map(q => ({ type: 'quiz', course_id: q.course_id, item_id: q.quiz_id, title: q.title, completions: q.attempts || 0 }))])
                .reduce((acc, d) => {
                  const cid = d.course_id ?? 'unknown'
                  acc[cid] = acc[cid] || { course_id: cid, lessons: [] }
                  acc[cid].lessons.push(d)
                  return acc
                }, {})
              )
                .filter(([cid]) => !!coursesMap[cid])
                .map(([cid, group]) => {
                  const courseTitle = coursesMap[cid]
                    const items = (group.lessons || [])
                      .slice()
                      .sort((a, b) => (a.completions || 0) - (b.completions || 0))
                    const lowest = items.length ? items[0].completions || 0 : 0
                    const lowestItems = items.filter((l) => (l.completions || 0) === lowest)
                  return (
                    <div key={cid} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                      <div className="mb-4">
                        <div className="font-semibold text-lg">{courseTitle}</div>
                        <div className="text-sm text-gray-600">
                          Lowest completions: {lowest}
                        </div>
                        <div className="text-sm mt-2">
                          {lowestItems.map((l, i) => (
                            <div key={l.item_id || i} className="text-sm">
                              • {l.title} {l.type === 'quiz' ? <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">Quiz</span> : ''} — {l.completions} completions
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={items.map((x) => ({
                              name: x.title,
                              completions: x.completions || 0,
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="name"
                              angle={-30}
                              textAnchor="end"
                              interval={0}
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value, name, props) => [`${value} completions`, props && props.payload && props.payload.type === 'quiz' ? 'Quiz' : 'Lesson']}
                              labelFormatter={(label, payload) => {
                                const t = payload && payload[0] && payload[0].payload && payload[0].payload.type === 'quiz' ? 'Quiz' : 'Lesson'
                                return `${t}: ${label}`
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="completions"
                              stroke="#f59e0b"
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#f59e0b' }}
                              activeDot={{ r: 8 }}
                            />
                            <Area
                              type="monotone"
                              dataKey="completions"
                              stroke={false}
                              fill="url(#colorCompletions)"
                            />
                            <defs>
                              <linearGradient
                                id="colorCompletions"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                <stop
                                  offset="95%"
                                  stopColor="#f59e0b"
                                  stopOpacity={0}
                                />
                              </linearGradient>
                            </defs>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </section>

        {/* Average Time Spent */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-4 border-b">Average Time Spent</h2>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="title" />
                <YAxis tickFormatter={fmtTime} />
                <Tooltip formatter={v => fmtTime(v)} />
                <Legend />
                <Bar dataKey="avg_seconds" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Quiz Performance */}
        <section className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Quiz Performance</h2>
              <p className="text-gray-500 text-sm">Average scores across quizzes</p>
            </div>
            <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-sm font-medium mt-3 sm:mt-0">
              Overall Avg: {avgQuizOverall}%
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={quizPerf}
                  dataKey="average_score_percent"
                  nameKey="title"
                  outerRadius={110}
                  innerRadius={60}
                  paddingAngle={3}
                  labelLine={false}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {quizPerf.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null
                    const data = payload[0].payload
                    return (
                      <div className="bg-white shadow-md rounded-md p-2 text-sm">
                        <p className="font-semibold text-gray-800">{data.title || data.name}</p>
                        <p className="text-gray-600">Avg Score: <span className="font-medium">{data.average_score_percent}%</span></p>
                        <p className="text-gray-600">Attempts: <span className="font-medium">{data.attempts}</span></p>
                        <p className="text-gray-600">Pass Rate: <span className="font-medium">{data.pass_rate_percent}%</span></p>
                      </div>
                    )
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Leaderboard */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold p-4 border-b">Leaderboard</h2>
          <div className="p-4">
            {leaderboard.length === 0 ? (
              <p className="text-sm text-gray-600">No leaderboard data available</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((p, idx) => (
                  <motion.li
                    key={p.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex justify-between items-center border-b pb-2"
                  >
                    <span className="font-medium text-gray-800">#{idx + 1} {p.full_name}</span>
                    <span className="text-blue-600 font-semibold">{p.points} pts</span>
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}