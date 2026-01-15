'use client'

import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, eachDayOfInterval, subDays } from 'date-fns'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Habit {
  id: string
  name: string
  category: string
  color: string
  completions: string[]
}

interface Project {
  id: string
  name: string
  description: string
  status: 'not-started' | 'in-progress' | 'completed'
  progress: number
  startDate: string
  endDate?: string
  tasks: Task[]
}

interface Task {
  id: string
  name: string
  completed: boolean
  completedDate?: string
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

export default function Home() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState<'habits' | 'projects'>('habits')
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  useEffect(() => {
    const savedHabits = localStorage.getItem('habits')
    const savedProjects = localStorage.getItem('projects')
    if (savedHabits) setHabits(JSON.parse(savedHabits))
    if (savedProjects) setProjects(JSON.parse(savedProjects))
  }, [])

  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects))
  }, [projects])

  const addHabit = () => {
    if (newHabitName.trim()) {
      const newHabit: Habit = {
        id: Date.now().toString(),
        name: newHabitName,
        category: newHabitCategory || 'General',
        color: COLORS[habits.length % COLORS.length],
        completions: []
      }
      setHabits([...habits, newHabit])
      setNewHabitName('')
      setNewHabitCategory('')
    }
  }

  const addProject = () => {
    if (newProjectName.trim()) {
      const newProject: Project = {
        id: Date.now().toString(),
        name: newProjectName,
        description: newProjectDesc,
        status: 'not-started',
        progress: 0,
        startDate: new Date().toISOString(),
        tasks: []
      }
      setProjects([...projects, newProject])
      setNewProjectName('')
      setNewProjectDesc('')
    }
  }

  const toggleHabitCompletion = (habitId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setHabits(habits.map(habit => {
      if (habit.id === habitId) {
        const completions = habit.completions.includes(today)
          ? habit.completions.filter(d => d !== today)
          : [...habit.completions, today]
        return { ...habit, completions }
      }
      return habit
    }))
  }

  const updateProjectProgress = (projectId: string, progress: number) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const status = progress === 0 ? 'not-started' : progress === 100 ? 'completed' : 'in-progress'
        return { ...project, progress, status, endDate: progress === 100 ? new Date().toISOString() : project.endDate }
      }
      return project
    }))
  }

  const deleteHabit = (habitId: string) => {
    setHabits(habits.filter(h => h.id !== habitId))
  }

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId))
  }

  const getTimeRangeInterval = () => {
    const now = new Date()
    switch (timeRange) {
      case 'day':
        return { start: now, end: now }
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) }
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) }
    }
  }

  const getHabitStats = () => {
    const interval = getTimeRangeInterval()
    return habits.map(habit => {
      const completionsInRange = habit.completions.filter(date => {
        const d = parseISO(date)
        return isWithinInterval(d, interval)
      }).length
      return {
        name: habit.name,
        completions: completionsInRange,
        color: habit.color
      }
    })
  }

  const getCompletionTrend = () => {
    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365
    const interval = { start: subDays(new Date(), days - 1), end: new Date() }
    const dateRange = eachDayOfInterval(interval)

    return dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const total = habits.reduce((sum, habit) =>
        sum + (habit.completions.includes(dateStr) ? 1 : 0), 0
      )
      return {
        date: format(date, timeRange === 'year' ? 'MMM' : 'MMM dd'),
        completions: total
      }
    })
  }

  const getCategoryStats = () => {
    const categories: { [key: string]: number } = {}
    const interval = getTimeRangeInterval()

    habits.forEach(habit => {
      const completionsInRange = habit.completions.filter(date => {
        const d = parseISO(date)
        return isWithinInterval(d, interval)
      }).length
      categories[habit.category] = (categories[habit.category] || 0) + completionsInRange
    })

    return Object.entries(categories).map(([name, value]) => ({ name, value }))
  }

  const getProjectStats = () => {
    return {
      total: projects.length,
      notStarted: projects.filter(p => p.status === 'not-started').length,
      inProgress: projects.filter(p => p.status === 'in-progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      avgProgress: projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0
    }
  }

  const habitStats = getHabitStats()
  const completionTrend = getCompletionTrend()
  const categoryStats = getCategoryStats()
  const projectStats = getProjectStats()
  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
            📊 Habit & Project Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Track your progress and achieve your goals</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'habits'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            Habits
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'projects'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
            }`}
          >
            Projects
          </button>
        </div>

        {/* Time Range Selector */}
        {activeTab === 'habits' && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {(['day', 'week', 'month', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                  timeRange === range
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'habits' ? (
          <>
            {/* Add Habit Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Add New Habit</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  placeholder="Habit name (e.g., Exercise, Read, Meditate)"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                />
                <input
                  type="text"
                  placeholder="Category (e.g., Health, Learning)"
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                />
                <button
                  onClick={addHabit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add Habit
                </button>
              </div>
            </div>

            {/* Habits List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Today's Habits</h2>
              {habits.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No habits yet. Add one above!</p>
              ) : (
                <div className="space-y-3">
                  {habits.map(habit => (
                    <div
                      key={habit.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <button
                        onClick={() => toggleHabitCompletion(habit.id)}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          habit.completions.includes(today)
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300 dark:border-gray-500'
                        }`}
                      >
                        {habit.completions.includes(today) && (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-white">{habit.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{habit.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {habit.completions.filter(date => {
                            const d = parseISO(date)
                            return isWithinInterval(d, getTimeRangeInterval())
                          }).length} times
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">this {timeRange}</p>
                      </div>
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Statistics */}
            {habits.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Completion Trend */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                    Completion Trend ({timeRange})
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="completions" stroke="#0ea5e9" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Habit Completions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                    Habit Completions ({timeRange})
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={habitStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="completions" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                {categoryStats.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                      Category Distribution ({timeRange})
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryStats}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Summary Stats */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Total Habits</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{habits.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Completed Today</span>
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {habits.filter(h => h.completions.includes(today)).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300">Total Completions ({timeRange})</span>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {habitStats.reduce((sum, h) => sum + h.completions, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Add Project Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Add New Project</h2>
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addProject()}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && addProject()}
                />
                <button
                  onClick={addProject}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add Project
                </button>
              </div>
            </div>

            {/* Projects List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Your Projects</h2>
              {projects.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No projects yet. Add one above!</p>
              ) : (
                <div className="space-y-4">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border-l-4"
                      style={{
                        borderLeftColor:
                          project.status === 'completed' ? '#10b981' :
                          project.status === 'in-progress' ? '#f59e0b' : '#6b7280'
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                          )}
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            project.status === 'completed' ? 'bg-green-100 text-green-800' :
                            project.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status === 'not-started' ? 'Not Started' :
                             project.status === 'in-progress' ? 'In Progress' : 'Completed'}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="text-red-500 hover:text-red-700 font-bold text-xl ml-4"
                        >
                          ×
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={project.progress}
                            onChange={(e) => updateProjectProgress(project.id, parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Statistics */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-400">Total Projects</h3>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{projectStats.total}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-400">In Progress</h3>
                  <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{projectStats.inProgress}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-400">Completed</h3>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">{projectStats.completed}</p>
                </div>
              </div>
            )}

            {/* Project Charts */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Project Status</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Not Started', value: projectStats.notStarted },
                          { name: 'In Progress', value: projectStats.inProgress },
                          { name: 'Completed', value: projectStats.completed },
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#6b7280" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Progress Overview</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={projects.map(p => ({ name: p.name, progress: p.progress }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="progress" fill="#0ea5e9" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
