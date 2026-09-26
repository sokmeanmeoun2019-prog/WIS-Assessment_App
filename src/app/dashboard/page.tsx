"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export default function TeacherDashboard() {
  const [localAssessments, setLocalAssessments] = useState<any[]>([])
  const [stats, setStats] = useState({
    students: '142',
    assessments: '4',
    submissions: '28',
    deadlines: '2'
  })

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
      setLocalAssessments(stored)
      
      const storedStats = localStorage.getItem('demo_dashboard_stats')
      if (storedStats) {
        setStats(JSON.parse(storedStats))
      } else if (stored.length > 0) {
        // Automatically sync active assessments if they haven't manually overridden stats yet
        setStats(s => ({...s, assessments: stored.length.toString()}))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const handleStatChange = (key: string, value: string) => {
    const newStats = { ...stats, [key]: value }
    setStats(newStats)
    localStorage.setItem('demo_dashboard_stats', JSON.stringify(newStats))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your classes today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats.students} onChange={(v: string) => handleStatChange('students', v)} icon={Users} color="bg-blue-500" />
        <StatCard title="Active Assessments" value={stats.assessments} onChange={(v: string) => handleStatChange('assessments', v)} icon={BookOpen} color="bg-indigo-500" />
        <StatCard title="Submissions to Grade" value={stats.submissions} onChange={(v: string) => handleStatChange('submissions', v)} icon={CheckCircle} color="bg-orange-500" />
        <StatCard title="Upcoming Deadlines" value={stats.deadlines} onChange={(v: string) => handleStatChange('deadlines', v)} icon={Clock} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            Needs Attention
          </h2>
          <div className="space-y-4">
            <ActionItem title="Grade 9 Class A - Kinematics Quiz" desc="15 submissions waiting for grading" action="Grade Now" href="/dashboard/submissions" />
            <ActionItem title="Grade 11 Class B - Forces Homework" desc="Deadline passed 2 hours ago" action="View Results" href="/dashboard/reports" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Active Assessments</h2>
          <div className="space-y-4">
            {localAssessments.length > 0 ? (
              localAssessments.slice(0, 4).map(a => (
                <AssessmentItem key={a.id} title={a.title} classInfo={a.grade} progress={0} />
              ))
            ) : (
              <>
                <AssessmentItem title="Dynamics Monthly Test" classInfo="Grade 10 Class C" progress={75} />
                <AssessmentItem title="Work & Energy Quiz" classInfo="Grade 11 Class A" progress={30} />
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

function StatCard({ title, value, onChange, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center space-x-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 whitespace-nowrap">{title}</p>
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-2xl font-bold text-slate-800 bg-transparent outline-none w-full border-b border-transparent hover:border-slate-300 focus:border-indigo-500 transition-colors cursor-text"
        />
      </div>
    </div>
  )
}

function ActionItem({ title, desc, action, href }: any) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
      <div>
        <h4 className="font-semibold text-slate-800">{title}</h4>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
      <Link href={href} className="text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors inline-block text-center">
        {action}
      </Link>
    </div>
  )
}

function AssessmentItem({ title, classInfo, progress }: any) {
  return (
    <div className="p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between mb-2">
        <div>
          <h4 className="font-semibold text-slate-800">{title}</h4>
          <p className="text-xs text-slate-500">{classInfo}</p>
        </div>
        <span className="text-sm font-bold text-indigo-600">{progress}% Submitted</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  )
}
