"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Clock, Pencil, Trash2, Key, X, Copy, Check, Share2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore'

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([])

  const [globalDefaults, setGlobalDefaults] = useState({
    defaultQuizTime: 30,
    defaultTestTime: 45
  })

  useEffect(() => {
    const loadAssessments = async () => {
      try {
        let stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        
        // Optimistic UI: Immediately show what we have in local storage!
        if (stored.length > 0) {
          setAssessments(stored);
        }

        try {
          // Fetch from Firebase (Background)
          const querySnapshot = await getDocs(collection(db, "assessments"));
          const cloudAssessments = querySnapshot.docs.map(doc => doc.data());
          
          // Merge logic: cloud overwrites local, except for local drafts that are newer or don't exist in cloud
          const merged = [...stored];
          cloudAssessments.forEach(cloudItem => {
            const idx = merged.findIndex(a => a.id === cloudItem.id);
            if (idx >= 0) {
              merged[idx] = cloudItem; // Cloud wins for published
            } else {
              merged.push(cloudItem);
            }
          });
          
          stored = merged;
          localStorage.setItem('demo_assessments', JSON.stringify(stored));
          setAssessments(stored);
        } catch (fbError) {
          console.error("Firebase fetch error", fbError);
        }

        // Add a dummy one if none exist and Firebase is empty
        if (stored.length === 0) {
          const dummy = {
            id: '1',
            title: 'Chapter 3: Kinematics Quiz',
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
          };
          setAssessments([dummy]);
          localStorage.setItem('demo_assessments', JSON.stringify([dummy]));
        }

        const d = JSON.parse(localStorage.getItem('demo_defaults_settings') || 'null')
        if (d) setGlobalDefaults(d)
      } catch (e) {
        console.error(e)
      }
    };
    loadAssessments();
  }, [])

  const getDisplayTime = (a: any) => {
    if (a.type === 'QUIZ') return globalDefaults.defaultQuizTime
    if (a.type === 'MONTHLY_TEST' || a.type === 'SEMESTER_EXAM') return globalDefaults.defaultTestTime
    return a.timeLimitMinutes || 'None'
  }

  const [manageSessionId, setManageSessionId] = useState<string | null>(null)
  const [previewSessionId, setPreviewSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadSessions = async () => {
      try {
        let storedSessions = JSON.parse(localStorage.getItem('demo_sessions') || '[]')
        
        try {
          const snap = await getDocs(collection(db, "sessions"));
          const cloudSessions = snap.docs.map(doc => doc.data());
          if (cloudSessions.length > 0) {
            const merged = [...storedSessions];
            cloudSessions.forEach(cs => {
              const idx = merged.findIndex(s => s.id === cs.id);
              if (idx >= 0) merged[idx] = cs; else merged.push(cs);
            });
            storedSessions = merged;
            localStorage.setItem('demo_sessions', JSON.stringify(storedSessions));
          }
        } catch(e) {}
        
        setSessions(storedSessions)
      } catch (e) { }
    };
    loadSessions();
  }, [])

  const saveSessions = async (newSessions: any[]) => {
    setSessions(newSessions)
    localStorage.setItem('demo_sessions', JSON.stringify(newSessions))
  }

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const handleAddSession = async (assessmentId: string) => {
    const newSession = {
      id: `sess-${Date.now()}`,
      assessmentId,
      className: 'New Class',
      code: generateCode(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    }
    const nextSessions = [...sessions, newSession];
    setSessions(nextSessions);
    localStorage.setItem('demo_sessions', JSON.stringify(nextSessions));
    
    // push to cloud
    try {
      await doc(collection(db, "sessions"), newSession.id);
      await setDoc(doc(db, "sessions", newSession.id), newSession);
    } catch(e) {}
  }

  const handleUpdateSession = async (sessionId: string, updates: any) => {
    const nextSessions = sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s);
    setSessions(nextSessions);
    localStorage.setItem('demo_sessions', JSON.stringify(nextSessions));

    try {
      const targetSession = nextSessions.find(s => s.id === sessionId);
      if (targetSession) {
        await setDoc(doc(db, "sessions", targetSession.id), targetSession);
      }
    } catch(e) {}
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const copyFullMessage = (session: any, assessment: any) => {
    const directLink = `${origin}/student/join?code=${session.code}`
    const msg = `${assessment.title}\n\nClick here to start: ${directLink}\n\nInstructions:\n1. Open the link.\n2. Enter your Full Name & Student ID.\n3. Complete the assessment before the time expires.`
    navigator.clipboard.writeText(msg)
    setCopiedCode(session.code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const copyLinkOnly = (session: any) => {
    const directLink = `${origin}/student/join?code=${session.code}`
    navigator.clipboard.writeText(directLink)
    setCopiedLink(session.id)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleDuplicateAssessment = (assessment: any) => {
    const newId = Date.now().toString();
    const newAssessment = {
      ...assessment,
      id: newId,
      title: `${assessment.title} (Copy)`,
      createdAt: new Date().toISOString()
    };
    
    const nextAssessments = [...assessments, newAssessment];
    setAssessments(nextAssessments);
    localStorage.setItem('demo_assessments', JSON.stringify(nextAssessments));
    
    showToast("Assessment duplicated successfully!");
    
    // Push to firebase so it works instantly everywhere
    try {
      setDoc(doc(db, "assessments", newId), newAssessment);
    } catch(e) {}
  }

  const handleQuickShare = (assessmentId: string) => {
    const existingSession = sessions.find(s => s.assessmentId === assessmentId && s.status === 'ACTIVE')
    if (existingSession) {
      copyLinkOnly(existingSession)
      showToast("Direct assessment link copied to clipboard!")
    } else {
      const newSession = {
        id: `sess-${Date.now()}`,
        assessmentId,
        className: 'General Class',
        code: generateCode(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      }
      
      const nextSessions = [...sessions, newSession];
      setSessions(nextSessions);
      localStorage.setItem('demo_sessions', JSON.stringify(nextSessions));
      
      // Push to cloud instantly so students can access it
      try {
        setDoc(doc(db, "sessions", newSession.id), newSession);
      } catch(e) {}
      
      copyLinkOnly(newSession)
      showToast("New session created. Direct assessment link copied to clipboard!")
    }
  }

  const currentAssessment = assessments.find(a => a.id === manageSessionId)

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assessments</h1>
          <p className="text-slate-500 mt-1">Manage your active quizzes, tests, and homework.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              const submissions = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
              const stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
              let recoveredCount = 0
              
              // First, check if the student submitted anything with 'thermo' or 'law' in the title
              const snapshots = submissions
                .map((s: any) => s.assessmentSnapshot)
                .filter((snap: any) => snap && snap.title && (snap.title.toLowerCase().includes('thermo') || snap.title.toLowerCase().includes('first law')))
                
              if (snapshots.length > 0) {
                // Find the best snapshot (most recent or with most questions)
                snapshots.sort((a: any, b: any) => (b.questions?.length || 0) - (a.questions?.length || 0))
                const bestSnap = snapshots[0]
                
                // See if it exists in stored
                const existing = stored.find((a: any) => a.id === bestSnap.id)
                if (!existing || existing.questions?.length < 3) {
                  // It's missing or overwritten. Let's restore it!
                  const filtered = stored.filter((a: any) => a.id !== bestSnap.id)
                  filtered.unshift(bestSnap) // Add it to the top
                  localStorage.setItem('demo_assessments', JSON.stringify(filtered))
                  setAssessments(filtered)
                  recoveredCount++
                }
              }
              
              if (recoveredCount > 0) {
                alert(`Successfully recovered your lost assessment from your submissions history!`)
              } else {
                alert('No lost assessment could be recovered. Did you remember to hit Submit at the end of the quiz?')
              }
            }}
            className="flex items-center px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold border border-amber-300 shadow-sm transition-colors"
          >
            Recover Lost Quiz
          </button>
          <Link 
            href="/dashboard/assessments/create"
            className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-200 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Create Assessment
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
          <div className="col-span-2">Title</div>
          <div>Grade Level</div>
          <div>Type</div>
          <div>Time Limit</div>
          <div>Actions</div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {assessments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No assessments found. Create one!</div>
          ) : (
            assessments.map((a) => (
              <div key={a.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                <div className="col-span-2 flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 border ${
                    a.type === 'HOMEWORK' ? 'bg-cyan-100 text-cyan-600 border-cyan-200' : 'bg-orange-100 text-orange-600 border-orange-200'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      Created {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-sm font-medium text-slate-700">
                  {a.grade}
                </div>

                <div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    a.type === 'HOMEWORK' ? 'bg-cyan-100 text-cyan-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {a.type}
                  </span>
                </div>

                <div className="text-sm text-slate-500 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {getDisplayTime(a) === 'None' ? 'None' : `${getDisplayTime(a)} mins`}
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleQuickShare(a.id)}
                    className="text-slate-400 hover:text-green-600 p-1 transition-colors" 
                    title="Quick Copy Link"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setManageSessionId(a.id)}
                    className="text-slate-400 hover:text-indigo-600 p-1 transition-colors" 
                    title="Manage Access Codes"
                  >
                    <Key className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDuplicateAssessment(a)}
                    className="text-slate-400 hover:text-blue-600 p-1 transition-colors" 
                    title="Duplicate Assessment"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <Link 
                    href={`/dashboard/assessments/create?edit=${a.id}`}
                    className="text-slate-400 hover:text-indigo-600 p-1 transition-colors" 
                    title="Edit Assessment"
                  >
                    <Pencil className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => {
                      const updated = assessments.filter(item => item.id !== a.id)
                      setAssessments(updated)
                      localStorage.setItem('demo_assessments', JSON.stringify(updated))
                    }}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors" 
                    title="Delete Assessment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center z-50 animate-bounce">
          <Check className="w-5 h-5 mr-3 text-green-400" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Session Management Modal */}
      {manageSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center">
                  <Key className="w-5 h-5 mr-2 text-indigo-600" />
                  Class Access Codes
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {currentAssessment?.title}
                </p>
              </div>
              <button onClick={() => setManageSessionId(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="mb-6 flex justify-between items-center">
                <p className="text-sm text-slate-600 font-medium">Generate a unique code for each class to securely control access.</p>
                <button 
                  onClick={() => handleAddSession(manageSessionId)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Class Session
                </button>
              </div>

              <div className="space-y-6">
                {sessions.filter(s => s.assessmentId === manageSessionId).length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No active sessions. Add a class to generate a code.</p>
                  </div>
                ) : (
                  sessions.filter(s => s.assessmentId === manageSessionId).map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      
                      {/* Session Row */}
                      <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 bg-white">
                        <div className="flex-1 space-y-3">
                          <input 
                            type="text" 
                            value={s.className} 
                            onChange={(e) => handleUpdateSession(s.id, { className: e.target.value })}
                            className="font-bold text-lg text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none w-full max-w-[200px]"
                            placeholder="Class Name"
                          />
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Access Code:</span>
                            <span className="font-mono text-lg font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 tracking-widest">{s.code}</span>
                            <button 
                              onClick={() => handleUpdateSession(s.id, { code: generateCode() })}
                              className="text-xs text-indigo-600 hover:underline ml-2 font-medium"
                            >
                              Regenerate
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
                            <select 
                              value={s.status} 
                              onChange={(e) => handleUpdateSession(s.id, { status: e.target.value })}
                              className={`text-sm font-bold outline-none border-none cursor-pointer ${s.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-400'}`}
                            >
                              <option value="ACTIVE">● Active</option>
                              <option value="CLOSED">○ Closed</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                          <button 
                            onClick={() => setPreviewSessionId(previewSessionId === s.id ? null : s.id)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg transition-colors flex items-center"
                          >
                            Share
                          </button>
                          <button 
                            onClick={() => saveSessions(sessions.filter(sess => sess.id !== s.id))}
                            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            title="Delete Session"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Visual Preview / Share Template */}
                      {previewSessionId === s.id && (
                        <div className="border-t border-slate-200 bg-slate-50 p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-lg">Example of what your students will receive</h3>
                            <button 
                              onClick={() => copyFullMessage(s, currentAssessment)}
                              className="text-sm font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center shadow-sm"
                            >
                              {copiedCode === s.code ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                              Copy Message
                            </button>
                          </div>
                          
                          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-4">
                              {s.className} Session
                            </span>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentAssessment?.title}</h2>
                            <p className="text-slate-500 mb-6">Your teacher has assigned this {currentAssessment?.type.toLowerCase()} to your class.</p>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-4">
                              <h4 className="font-bold text-slate-800 mb-2">Direct Assessment Link</h4>
                              <p className="text-slate-500 text-sm mb-4">Send this link to your Telegram group. Students won't need to type the code.</p>
                              <button 
                                onClick={() => copyLinkOnly(s)}
                                className="w-full py-3 bg-white border border-slate-300 rounded-xl flex items-center justify-center font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                              >
                                {copiedLink === s.id ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2 text-slate-400" />}
                                Copy Direct Link
                              </button>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6">
                              <h4 className="font-bold text-slate-800 mb-2">Class access code (Optional)</h4>
                              <p className="text-4xl font-black text-green-700 tracking-widest font-mono py-2">{s.code}</p>
                              <p className="text-slate-500 text-sm">If a student loses the link, they can still go to the portal and type this code manually.</p>
                            </div>

                            <p className="text-sm text-slate-500">Students open the direct link, provide their student information, and begin the assessment immediately.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
