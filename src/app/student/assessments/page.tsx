"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Search, Filter } from 'lucide-react'

export default function StudentAssessmentsPage() {
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
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <BookOpen className="w-8 h-8 mr-3 text-indigo-600" /> All Assessments
          </h1>
          <p className="text-slate-500 mt-2">View and start all your available quizzes, tests, and homework.</p>
        </div>
        
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search assessments..." 
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg flex items-center hover:bg-slate-50 font-medium">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Custom Local Assessments */}
        {localAssessments.map((assessment) => (
          <div key={assessment.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
            <div className={`absolute top-0 left-0 w-1 h-full ${assessment.type === 'HOMEWORK' ? 'bg-cyan-400' : 'bg-orange-400'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${assessment.type === 'HOMEWORK' ? 'bg-cyan-100 text-cyan-700' : 'bg-orange-100 text-orange-700'}`}>
                {assessment.type}
              </span>
              <span className="text-xs font-medium text-slate-500">{assessment.timeLimitMinutes} mins</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2 line-clamp-2" title={assessment.title}>{assessment.title}</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">Custom Assessment assigned to {assessment.grade}</p>
            <Link href={`/student/assessment/${assessment.id}`} className={`w-full block text-center py-2.5 rounded-lg font-medium transition-colors mt-auto ${assessment.type === 'HOMEWORK' ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
              {assessment.type === 'HOMEWORK' ? 'View Homework' : 'Start Quiz'}
            </Link>
          </div>
        ))}

        {/* Hardcoded Assessment Cards */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">QUIZ</span>
            <span className="text-xs font-medium text-slate-500">25 mins</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Kinematics Chapter 3</h3>
          <p className="text-sm text-slate-500 mb-6 flex-1">Due Today at 11:59 PM</p>
          <Link href="/student/assessment/1" className="w-full block text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors mt-auto">
            Start Quiz
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400"></div>
          <div className="flex justify-between items-start mb-4">
            <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full">HOMEWORK</span>
            <span className="text-xs font-medium text-slate-500">No time limit</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Vectors Worksheet</h3>
          <p className="text-sm text-slate-500 mb-6 flex-1">Due Friday, 5:00 PM</p>
          <Link href="/student/assessment/2" className="w-full block text-center py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors mt-auto">
            View Homework
          </Link>
        </div>
      </div>
    </div>
  )
}
