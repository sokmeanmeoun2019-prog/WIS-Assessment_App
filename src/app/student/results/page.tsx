"use client"
import React, { useState, useEffect } from 'react'
import { FileText, CheckCircle, Download, Award } from 'lucide-react'
import Link from 'next/link'

export default function StudentResultsPage() {
  const [identity, setIdentity] = useState<{studentId: string, studentName: string} | null>(null)
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    try {
      const storedIdentity = JSON.parse(localStorage.getItem('demo_student_identity') || 'null')
      if (storedIdentity) {
        setIdentity(storedIdentity)
        
        const submissions = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
        const mySubmissions = submissions.filter((s: any) => s.studentId === storedIdentity.studentId)
        setResults(mySubmissions)
      }
    } catch (e) {}
  }, [])

  if (!identity) {
    return (
      <div className="max-w-6xl mx-auto pb-24 pt-12 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-md">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Student Identity Found</h2>
          <p className="text-slate-500 mb-6">Take an assessment via the Student Portal first, and your identity will be remembered here to view your results.</p>
        </div>
      </div>
    )
  }

  const gradedResults = results.filter(r => r.status !== 'Needs Grading' && r.score !== undefined)
  const averageScore = gradedResults.length > 0 
    ? Math.round(gradedResults.reduce((acc, r) => acc + r.score, 0) / gradedResults.length)
    : 0

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-indigo-600" /> My Results
          </h1>
          <p className="text-slate-500 mt-2">
            Viewing records for <strong className="text-slate-700">{identity.studentName}</strong> ({identity.studentId})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-indigo-600 text-white rounded-2xl p-6 shadow-md flex items-center">
          <div className="bg-white/20 p-4 rounded-xl mr-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-indigo-100 font-medium">Average Graded Score</p>
            <h3 className="text-3xl font-bold">{gradedResults.length > 0 ? `${averageScore}%` : 'N/A'}</h3>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center">
          <div className="bg-green-100 p-4 rounded-xl mr-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-slate-500 font-medium">Completed</p>
            <h3 className="text-3xl font-bold text-slate-800">{results.length} Assessments</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Recent History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {results.length === 0 ? (
             <div className="p-8 text-center text-slate-500">You haven't completed any assessments yet.</div>
          ) : results.map((r) => {
            const isPending = r.status === 'Needs Grading' || r.score === undefined
            
            const InnerContent = (
              <>
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mr-4 ${
                    isPending ? 'bg-slate-200 text-slate-500' :
                    r.score >= 90 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isPending ? '...' : `${r.score}%`}
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${isPending ? 'text-slate-500' : 'text-slate-800'}`}>
                      {r.assessmentTitle}
                    </h4>
                    <div className="flex items-center text-sm mt-1">
                      <span className="text-slate-500 mr-3">
                        {new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {isPending ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-500 rounded text-xs font-bold">PENDING REVIEW</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">GRADED</span>
                      )}
                    </div>
                  </div>
                </div>
                {!isPending && (
                  <div className="p-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-lg transition-colors flex items-center text-sm">
                    View Paper
                  </div>
                )}
              </>
            )
            
            return isPending ? (
              <div key={r.id} className="block p-6 flex items-center justify-between transition-colors bg-slate-50/50 cursor-not-allowed opacity-80" onClick={() => alert("This paper is still being graded by your teacher. Check back later.")}>
                {InnerContent}
              </div>
            ) : (
              <Link href={`/student/results/${r.id}`} key={r.id} className="block p-6 flex items-center justify-between transition-colors hover:bg-slate-50">
                {InnerContent}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
