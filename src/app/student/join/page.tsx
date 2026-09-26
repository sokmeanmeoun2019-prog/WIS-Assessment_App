"use client"
import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Lightbulb, Lock, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export default function StudentJoin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [step, setStep] = useState(1)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [session, setSession] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const [studentName, setStudentName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [testCode, setTestCode] = useState<string | null>(null)

  useEffect(() => {
    // Helper for reviewers: auto-generate a dummy code if the system is completely empty
    try {
      const storedSessions = JSON.parse(localStorage.getItem('demo_sessions') || '[]')
      const storedAssessments = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
      
      let initialTestCode = ''

      if (storedSessions.length === 0) {
        let defaultAssessmentId = '1'
        if (storedAssessments.length === 0) {
          const dummyAss = {
            id: '1',
            title: 'Demo Physics Quiz',
            grade: 'Grade 9',
            type: 'QUIZ',
            timeLimitMinutes: 25,
            createdAt: new Date().toISOString(),
            questions: [
              {
                id: 'q1',
                type: 'MCQ',
                content: 'What is the unit of Force?',
                points: 1,
                options: [{id: 'o1', text: 'Newton'}, {id: 'o2', text: 'Joule'}],
                correctAnswer: 'o1'
              }
            ]
          }
          localStorage.setItem('demo_assessments', JSON.stringify([dummyAss]))
        } else {
          defaultAssessmentId = storedAssessments[0].id
        }

        const newCode = 'TEST12'
        const dummySession = {
          id: `sess-test`,
          assessmentId: defaultAssessmentId,
          className: 'Test Class',
          code: newCode,
          status: 'ACTIVE',
          createdAt: new Date().toISOString()
        }
        localStorage.setItem('demo_sessions', JSON.stringify([dummySession]))
        setTestCode(newCode)
        initialTestCode = newCode
      } else {
        setTestCode(storedSessions[0].code)
      }

      // Check URL parameters for a direct link
      const urlCode = searchParams.get('code')
      if (urlCode) {
        setCode(urlCode.toUpperCase())
        const sessionsToSearch = storedSessions.length > 0 ? storedSessions : JSON.parse(localStorage.getItem('demo_sessions') || '[]')
        const foundSession = sessionsToSearch.find((s: any) => s.code.toUpperCase() === urlCode.toUpperCase())
        
        if (foundSession && foundSession.status !== 'CLOSED') {
          const foundAssessment = storedAssessments.find((a: any) => a.id === foundSession.assessmentId) || JSON.parse(localStorage.getItem('demo_assessments') || '[]').find((a: any) => a.id === foundSession.assessmentId)
          if (foundAssessment) {
            setSession(foundSession)
            setAssessment(foundAssessment)
            setStep(2)
          }
        }
      }
    } catch (e) {}
  }, [searchParams])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!code.trim() || code.length < 6) {
      setError("Please enter a valid 6-character code.")
      return
    }

    try {
      let foundSession = null;
      let foundAssessment = null;

      // Check Cloud with a 3-second timeout to prevent 1-minute freezes
      try {
        const fetchSession = getDocs(query(collection(db, "sessions"), where("code", "==", code.toUpperCase())));
        const timeoutSession = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const qSnap: any = await Promise.race([fetchSession, timeoutSession]);
        
        if (!qSnap.empty) {
          foundSession = qSnap.docs[0].data();
        }
      } catch(fbErr) {
        console.error("Firebase fetch error", fbErr);
      }

      // Fallback local
      if (!foundSession) {
        const storedSessions = JSON.parse(localStorage.getItem('demo_sessions') || '[]')
        foundSession = storedSessions.find((s: any) => s.code.toUpperCase() === code.toUpperCase())
      }
      
      if (!foundSession) {
        setError("Invalid access code. Please check with your teacher.")
        return
      }

      if (foundSession.status === 'CLOSED') {
        setError("This assessment session is closed.")
        return
      }

      if (foundSession.deadline && new Date() > new Date(foundSession.deadline)) {
        setError("The deadline for this assessment has passed.")
        return
      }

      // Check Cloud for Assessment with a 3-second timeout
      try {
        const fetchAssessment = getDocs(query(collection(db, "assessments"), where("id", "==", foundSession.assessmentId)));
        const timeoutAssessment = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const qSnap: any = await Promise.race([fetchAssessment, timeoutAssessment]);
        
        if (!qSnap.empty) {
          foundAssessment = qSnap.docs[0].data();
        }
      } catch(fbErr) {}

      // Fallback local
      if (!foundAssessment) {
        const storedAssessments = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        foundAssessment = storedAssessments.find((a: any) => a.id === foundSession.assessmentId)
      }

      if (!foundAssessment) {
        setError("Assessment not found.")
        return
      }

      setSession(foundSession)
      setAssessment(foundAssessment)
      setStep(2)

    } catch (e) {
      setError("An error occurred verifying the code.")
    }
  }

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!studentName.trim() || !studentId.trim()) {
      setError("Please provide your full name and Class.")
      return
    }

    // Check if student already submitted for this specific session
    try {
      const submissions = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      const hasSubmitted = submissions.some((sub: any) => 
        sub.assessmentId === assessment.id && 
        sub.sessionId === session.id && 
        sub.studentId === studentId
      )

      if (hasSubmitted) {
        // Change from a generic error to a specific state so we can show a "View Results" button
        setAlreadySubmitted(true)
        return
      }

      // Generate a secure session token and store student identity
      const studentSession = {
        studentId,
        studentName,
        sessionId: session.id,
        assessmentId: assessment.id,
        className: session.className,
        startedAt: new Date().toISOString(),
        deadline: session.deadline || null
      }

      localStorage.setItem('demo_active_student_session', JSON.stringify(studentSession))
      localStorage.setItem('demo_student_identity', JSON.stringify({ studentId, studentName }))
      
      // Redirect to actual assessment taking page
      router.push(`/student/assessment/${assessment.id}`)
      
    } catch (err) {
      setError("Error starting assessment.")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-12 z-10 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shadow-md">
            <Lightbulb className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold text-slate-800 tracking-tight">Sokmean Academy</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-[#1e3250] p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Student Access</h1>
            <p className="text-blue-200 text-sm">Enter your class code to begin your assessment.</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                {error}
              </div>
            )}

            {alreadySubmitted ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Assessment Submitted</h3>
                <p className="text-slate-600">You have already completed this assessment. Multiple attempts are not permitted.</p>
                <div className="pt-4 space-y-3">
                  <button 
                    onClick={() => {
                      // Store identity so the results page knows who they are
                      localStorage.setItem('demo_student_identity', JSON.stringify({ studentId, studentName }))
                      router.push('/student/results')
                    }}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center text-lg"
                  >
                    View My Results <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                  <button 
                    onClick={() => { setStep(1); setCode(''); setError(''); setAlreadySubmitted(false); }}
                    className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium"
                  >
                    Use a different Access Code
                  </button>
                </div>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Class Access Code</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. A7K9P2"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xl tracking-widest font-bold text-slate-800 transition-all placeholder-slate-300 uppercase"
                      maxLength={8}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center text-lg"
                >
                  Verify Code <ArrowRight className="w-5 h-5 ml-2" />
                </button>
                {testCode && (
                  <p className="text-center text-sm text-slate-400 mt-4">
                    Testing the app? Use active code: <strong className="text-slate-600">{testCode}</strong>
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={handleStart} className="space-y-6">
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start mb-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-bold text-blue-900">{assessment.title}</h3>
                    <p className="text-sm text-blue-700 mt-1 font-medium">{session.className}</p>
                    <p className="text-xs text-blue-600 mt-1">{assessment.timeLimitMinutes > 0 ? `${assessment.timeLimitMinutes} minutes` : 'No time limit'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Class</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="e.g. Grade 9A"
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-[#1e3250] hover:bg-[#152338] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center text-lg mt-4"
                >
                  Start Assessment
                </button>
                
                <button 
                  type="button"
                  onClick={() => { setStep(1); setCode(''); setError(''); }}
                  className="w-full py-2 text-slate-500 hover:text-slate-700 text-sm font-medium mt-2"
                >
                  Cancel & Return
                </button>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
