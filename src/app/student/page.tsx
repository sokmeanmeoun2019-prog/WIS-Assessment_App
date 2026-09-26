"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react'

export default function StudentDashboard() {
  const [localAssessments, setLocalAssessments] = useState<any[]>([])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
      setLocalAssessments(stored)
    } catch (err) {
      console.error(err)
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <h1 className="text-3xl font-bold mb-2 relative z-10">Welcome back, John!</h1>
        <p className="text-indigo-100 mb-6 relative z-10 max-w-lg">
          You have {localAssessments.length + 1} upcoming quizzes and 1 homework assignment due this week. Stay on top of your physics concepts!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* To Do List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-indigo-600" /> Action Required
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Custom Local Assessments */}
            {localAssessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${assessment.type === 'HOMEWORK' ? 'bg-cyan-400' : 'bg-orange-400'}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${assessment.type === 'HOMEWORK' ? 'bg-cyan-100 text-cyan-700' : 'bg-orange-100 text-orange-700'}`}>
                    {assessment.type}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{assessment.timeLimitMinutes} mins</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 truncate" title={assessment.title}>{assessment.title}</h3>
                <p className="text-sm text-slate-500 mb-6">Custom Draft</p>
                <Link href={`/student/assessment/${assessment.id}`} className={`w-full block text-center py-2.5 rounded-lg font-medium transition-colors ${assessment.type === 'HOMEWORK' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                  {assessment.type === 'HOMEWORK' ? 'View Homework' : 'Start Quiz'}
                </Link>
              </div>
            ))}

            {/* Hardcoded Assessment Cards */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">QUIZ</span>
                <span className="text-xs font-medium text-slate-500">25 mins</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Kinematics Chapter 3</h3>
              <p className="text-sm text-slate-500 mb-6">Due Today at 11:59 PM</p>
              <Link href="/student/assessment/1" className="w-full block text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                Start Quiz
              </Link>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400"></div>
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full">HOMEWORK</span>
                <span className="text-xs font-medium text-slate-500">No time limit</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Vectors Worksheet</h3>
              <p className="text-sm text-slate-500 mb-6">Due Friday, 5:00 PM</p>
              <Link href="/student/assessment/2" className="w-full block text-center py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors">
                View Homework
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Results */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-500" /> Recent Results
          </h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
              <div>
                <h4 className="font-semibold text-slate-800">Forces Quiz</h4>
                <p className="text-xs text-slate-500">Published 2 days ago</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">85%</div>
              </div>
            </div>
            
            <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer">
              <div>
                <h4 className="font-semibold text-slate-800">1D Motion Test</h4>
                <p className="text-xs text-slate-500">Published last week</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-indigo-600">92%</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
