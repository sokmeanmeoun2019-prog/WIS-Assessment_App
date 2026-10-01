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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('demo_student_identity') || 'null')
      if (stored) setIdentity(stored)
    } catch (e) {}
  }, [])

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1e3250] text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="py-6 border-b border-[#2a456e] bg-[#152338] relative flex flex-col items-center text-center shrink-0">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight leading-tight">MyAssessments</span>
          <button 
            className="lg:hidden text-slate-400 hover:text-white p-2 absolute top-4 right-4"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
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
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 shadow-sm shrink-0">
          <div className="flex items-center">
            <button 
              className="lg:hidden mr-4 text-slate-500 hover:text-indigo-600 p-1"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold text-slate-800 hidden sm:block">Student Portal</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 leading-tight">{identity ? identity.studentName : 'Guest'}</p>
              <p className="text-xs text-slate-500 leading-tight hidden sm:block">{identity ? identity.studentId : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shrink-0">
              {identity ? identity.studentName.charAt(0).toUpperCase() : 'G'}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
