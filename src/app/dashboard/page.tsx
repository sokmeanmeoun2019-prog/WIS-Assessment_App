"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { db, auth } from '@/lib/firebase'
import { getDocs, collection } from 'firebase/firestore'
import { useAuth } from '@/context/AuthContext'

export default function TeacherDashboard() {
  const { user } = useAuth()
  
  const [assessments, setAssessments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  
  const [stats, setStats] = useState({
    students: 0,
    assessments: 0,
    submissions: 0,
    deadlines: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Optimistic load from local storage
        let localAss = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        let localSubs = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
        let localSess = JSON.parse(localStorage.getItem('demo_sessions') || '[]')

        if (user?.uid) {
          localAss = localAss.filter((a: any) => a.teacherId === user.uid)
          const ownedIds = localAss.map((a: any) => a.id)
          localSubs = localSubs.filter((s: any) => ownedIds.includes(s.assessmentId))
          localSess = localSess.filter((s: any) => ownedIds.includes(s.assessmentId))
        }

        setAssessments(localAss)
        setSubmissions(localSubs)
        setSessions(localSess)

        // Calculate initial stats
        calculateStats(localAss, localSubs, localSess)

        // 2. Fetch from Firebase
        if (!user?.uid) return;
        
        const [assSnap, subSnap, sessSnap] = await Promise.all([
          getDocs(collection(db, "assessments")),
          getDocs(collection(db, "submissions")),
          getDocs(collection(db, "sessions"))
        ])

        const cloudAss = assSnap.docs.map(d => d.data()).filter(a => a.teacherId === user.uid)
        const ownedIds = cloudAss.map(a => a.id)
        const cloudSubs = subSnap.docs.map(d => d.data()).filter(s => ownedIds.includes(s.assessmentId))
        const cloudSess = sessSnap.docs.map(d => d.data()).filter(s => ownedIds.includes(s.assessmentId))

        setAssessments(cloudAss)
        setSubmissions(cloudSubs)
        setSessions(cloudSess)
        
        // Save back merged/updated data to local
        localStorage.setItem('demo_assessments', JSON.stringify(cloudAss))
        localStorage.setItem('demo_submissions', JSON.stringify(cloudSubs))
        localStorage.setItem('demo_sessions', JSON.stringify(cloudSess))

        calculateStats(cloudAss, cloudSubs, cloudSess)

      } catch (e) {
        console.error("Dashboard fetch error:", e)
      }
    }

    fetchData()
  }, [user])

  const calculateStats = (ass: any[], subs: any[], sess: any[]) => {
    // Unique students based on submissions
    const uniqueStudents = new Set(subs.map(s => s.studentName?.trim().toLowerCase()).filter(Boolean))
    
    // Submissions that need grading
    const toGrade = subs.filter(s => s.status !== 'Graded')

    // Only count sessions that actually have a future deadline set
    const upcomingDeadlines = sess.filter(s => s.deadline && new Date(s.deadline) > new Date()).length

    setStats({
      students: uniqueStudents.size,
      assessments: ass.length,
      submissions: toGrade.length,
      deadlines: upcomingDeadlines
    })
  }

  // Find assessments that need attention
  const needsAttention = assessments
    .map(a => {
      const pendingCount = submissions.filter(s => s.assessmentId === a.id && s.status !== 'Graded').length
      return { ...a, pendingCount }
    })
    .filter(a => a.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount)
    .slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here's what's happening with your classes today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats.students} icon={Users} color="bg-blue-500" />
        <StatCard title="Active Assessments" value={stats.assessments} icon={BookOpen} color="bg-indigo-500" />
        <StatCard title="Submissions to Grade" value={stats.submissions} icon={CheckCircle} color="bg-orange-500" />
        <StatCard title="Upcoming Deadlines" value={stats.deadlines} icon={Clock} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
            Needs Attention
          </h2>
          <div className="space-y-4">
            {needsAttention.length > 0 ? (
              needsAttention.map(a => (
                <ActionItem 
                  key={a.id}
                  title={`${a.grade || 'General'} - ${a.title}`} 
                  desc={`${a.pendingCount} submissions waiting for grading`} 
                  action="Grade Now" 
                  href="/dashboard/submissions" 
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">All caught up! No grading needed right now.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Active Assessments</h2>
          <div className="space-y-4">
            {assessments.length > 0 ? (
              assessments.slice(0, 4).map(a => {
                const subCount = submissions.filter(s => s.assessmentId === a.id).length
                return (
                  <AssessmentItem 
                    key={a.id} 
                    title={a.title} 
                    classInfo={a.grade || 'General'} 
                    submittedCount={subCount} 
                  />
                )
              })
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">You have no active assessments.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center space-x-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 leading-snug">{title}</p>
        <div className="text-2xl font-bold text-slate-800 bg-transparent w-full mt-1">
          {value}
        </div>
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
      <Link href={href} className="text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors inline-block text-center whitespace-nowrap ml-4">
        {action}
      </Link>
    </div>
  )
}

function AssessmentItem({ title, classInfo, submittedCount }: any) {
  return (
    <div className="p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-semibold text-slate-800">{title}</h4>
          <p className="text-xs text-slate-500">{classInfo}</p>
        </div>
        <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{submittedCount} Submitted</span>
      </div>
    </div>
  )
}
