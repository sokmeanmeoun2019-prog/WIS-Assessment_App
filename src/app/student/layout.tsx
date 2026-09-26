"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Clock, FileText, LogOut, Atom } from 'lucide-react'

const studentLinks = [
  { name: 'My Dashboard', href: '/student', icon: Home },
  { name: 'Assessments', href: '/student/assessments', icon: BookOpen },
  { name: 'Results', href: '/student/results', icon: FileText },
]

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Hide sidebar for assessment mode and the join page
  const isAssessmentMode = (pathname.includes('/assessment/') && !pathname.includes('results')) || pathname.includes('/student/join')

  if (isAssessmentMode) {
    return <div className="min-h-screen bg-slate-50">{children}</div>
  }

  const [identity, setIdentity] = React.useState<{studentName: string, studentId: string} | null>(null)

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('demo_student_identity') || 'null')
      if (stored) setIdentity(stored)
    } catch (e) {}
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e3250] text-slate-300 flex flex-col shadow-xl z-20">
        <div className="h-20 flex items-center px-6 border-b border-[#2a456e] bg-[#152338]">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight leading-tight">Sokmean<br/>Academy</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-1">
          {studentLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || (link.href !== '/student' && pathname.startsWith(link.href))
            return (
              <Link 
                key={link.name} 
                href={link.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'hover:bg-[#2a456e] hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-blue-300'}`} />
                {link.name}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-[#2a456e]">
          <Link href="/" className="flex items-center px-4 py-3 text-sm font-medium rounded-lg hover:bg-[#2a456e] hover:text-white transition-colors text-pink-300 hover:text-pink-200">
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Student Portal</h2>
          <div className="flex items-center space-x-4">
            <div className="text-right mr-2">
              <p className="text-sm font-bold text-slate-800">{identity ? identity.studentName : 'Guest Student'}</p>
              <p className="text-xs text-slate-500">{identity ? identity.studentId : 'Not identified'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              {identity ? identity.studentName.charAt(0).toUpperCase() : 'G'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
