"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, Send, ChevronRight, ChevronLeft, CheckCircle2, Upload } from 'lucide-react'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'
import MathEditor from '@/components/MathEditor'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection } from 'firebase/firestore'

const renderReadOnlyMath = (html: string | undefined) => {
  if (!html) return ''
  let cleaned = html.replace(/<math-field/g, '<math-field readonly')
  
  // 1. Remove <br> that are immediately before a closing block tag (common contentEditable quirk)
  cleaned = cleaned.replace(/<br\s*\/?>\s*(?=<\/(div|p)>)/gi, '')
  
  // 2. Clean up empty lines and breaks at the very beginning or end, even if they have attributes
  cleaned = cleaned.replace(/^(<br\s*\/?>|<div[^>]*>\s*<\/div>|<p[^>]*>\s*<\/p>|\s|&nbsp;)+/gi, '')
  cleaned = cleaned.replace(/(<br\s*\/?>|<div[^>]*>\s*<\/div>|<p[^>]*>\s*<\/p>|\s|&nbsp;)+$/gi, '')
  
  return cleaned
}

const MatchingSelect = ({ value, options, onChange, placeholder }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div 
        onClick={() => setOpen(!open)}
        className="w-full p-3 rounded-lg border-2 border-slate-300 bg-white shadow-sm font-medium text-slate-700 cursor-pointer flex justify-between items-center"
      >
        <div className="pointer-events-none" dangerouslySetInnerHTML={{ __html: value ? renderReadOnlyMath(value) : placeholder }} />
        <span className="text-xs text-slate-400 ml-2">▼</span>
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 w-full mt-1 bg-white border-2 border-slate-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {options.map((opt: string, idx: number) => (
              <div 
                key={idx}
                onClick={() => { onChange(opt); setOpen(false); }}
                className="p-3 hover:bg-indigo-50 border-b border-slate-100 cursor-pointer transition-colors"
              >
                <div className="pointer-events-none" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(opt) }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Mock Data for the assessment
const mockAssessment = {
  id: '1',
  title: 'Chapter 3: Kinematics Quiz',
  timeLimitMinutes: 25,
  questions: [
    {
      id: 'q1',
      type: 'MCQ',
      content: 'A car accelerates uniformly from rest to a velocity of 20 m/s in 5 seconds. What is its acceleration?',
      options: [
        { id: 'o1', text: '4 m/s²' },
        { id: 'o2', text: '5 m/s²' },
        { id: 'o3', text: '100 m/s²' },
        { id: 'o4', text: '2 m/s²' }
      ]
    },
    {
      id: 'q2',
      type: 'PHYSICS_CALCULATION',
      content: 'Derive the equation $v^2 = u^2 + 2as$ starting from the basic definitions of velocity and acceleration. Show your work clearly.',
    }
  ]
}

function TimerDisplay({ initialSeconds, onExpire, isPaused }: { initialSeconds: number, onExpire: () => void, isPaused: boolean }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds)
  const onExpireRef = React.useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    setTimeLeft(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onExpireRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaused])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center px-4 py-2 rounded-xl font-mono text-xl font-bold ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
      <Clock className="w-5 h-5 mr-2" />
      {formatTime(timeLeft)}
    </div>
  )
}

export default function AssessmentTake({ params }: { params: { id: string } }) {
  const router = useRouter()
  
  const [assessment, setAssessment] = useState<any>(null)
  const [studentSession, setStudentSession] = useState<any>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [blockError, setBlockError] = useState<string | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  // Anti-cheating: Block keyboard shortcuts (Copy, Paste, Print, Inspect Element)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C (Copy), Ctrl+V (Paste), Ctrl+P (Print), Ctrl+S (Save), F12 (Inspect), Ctrl+Shift+I (Inspect)
      if (
        (e.ctrlKey || e.metaKey) && 
        (e.key === 'c' || e.key === 'C' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'v' || e.key === 'V')
      ) {
        e.preventDefault()
      }
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
        e.preventDefault()
      }
    }

    // Block copy events completely
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('copy', handleCopy)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('copy', handleCopy)
    }
  }, [])

  useEffect(() => {
    try {
      const activeSessionStr = localStorage.getItem('demo_active_student_session')
      if (!activeSessionStr) {
        setBlockError("Unauthorized. Please join via the Student Access portal.")
        return
      }
      
      const activeSession = JSON.parse(activeSessionStr)
      if (activeSession.assessmentId !== params.id) {
        setBlockError("Unauthorized. This session does not match the active assessment.")
        return
      }

      const submissions = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      const hasSubmitted = submissions.some((sub: any) => 
        sub.assessmentId === activeSession.assessmentId && 
        sub.sessionId === activeSession.sessionId && 
        sub.studentId === activeSession.studentId
      )

      if (hasSubmitted) {
        setBlockError("You have already submitted this assessment. Multiple attempts are not permitted.")
        return
      }

      if (activeSession.deadline && new Date() > new Date(activeSession.deadline)) {
        setBlockError("The deadline for this assessment has passed. You can no longer access it.")
        return
      }

      setStudentSession(activeSession)

      const loadData = async () => {
        try {
          let found = null;
          
          // Try Firebase first with a 3-second timeout
          try {
            const fetchPromise = getDoc(doc(db, "assessments", params.id as string));
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
            const docSnap: any = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (docSnap && docSnap.exists && docSnap.exists()) {
              found = docSnap.data();
            }
          } catch (fbErr) {
            console.warn("Firebase failed to load assessment, falling back to local storage", fbErr);
          }

          // Fallback to local storage if Firebase failed or document didn't exist
          if (!found) {
            const stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
            found = stored.find((a: any) => String(a.id) === String(params.id))
          }

          if (found && found.questions) {
            const sections: any[][] = [];
        let currentSection: any[] = [];
        
        found.questions.forEach((q: any) => {
          if (q.type === 'SECTION_BREAK') {
            if (currentSection.length > 0) sections.push(currentSection);
            sections.push([q]);
            currentSection = [];
          } else {
            currentSection.push(q);
          }
        });
        if (currentSection.length > 0) sections.push(currentSection);
        
        const shuffledQuestions = sections.map(section => {
          if (section.length === 1 && section[0].type === 'SECTION_BREAK') return section;
          
          const shuffled = [...section];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          // Also properly shuffle Matching right options
          shuffled.forEach(q => {
            if (q.type === 'MATCHING' && q.pairs) {
              const rights = q.pairs.map((p: any) => p.right);
              for (let i = rights.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rights[i], rights[j]] = [rights[j], rights[i]];
              }
              q.shuffledRightOptions = rights;
            }
          });
          
          return shuffled;
        }).flat();
        
        found.questions = shuffledQuestions;
        }
        
        setAssessment(found || mockAssessment)
      } catch (innerErr) {
        setBlockError("Failed to load assessment.")
      }
    };
    loadData();

    } catch (err) {
      setBlockError("Failed to verify session.")
    }
  }, [params.id])

  const handleAnswer = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  const handleSubmit = async () => {
    // Strict Deadline Enforcement
    if (studentSession?.deadline && new Date() > new Date(studentSession.deadline)) {
      setBlockError("The deadline for this assessment has passed. Your answers cannot be submitted.");
      return;
    }

    // Check required questions
    if (assessment && assessment.questions) {
      const missingRequired = assessment.questions.find((q: any) => {
        if (q.type === 'SECTION_BREAK' || !q.isRequired) return false;
        const ans = answers[q.id];
        if (ans === undefined || ans === null || ans === '') return true;
        if (Array.isArray(ans) && ans.length === 0) return true;
        if (typeof ans === 'object' && Object.keys(ans).length === 0) return true;
        return false;
      });

      if (missingRequired) {
        alert("Please answer all required questions before submitting.");
        return;
      }
    }

    setSubmitted('saving')
    
    try {
      const newSubmission = {
        id: `sub-${Date.now()}`,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        sessionId: studentSession.sessionId,
        studentId: studentSession.studentId,
        studentName: studentSession.studentName,
        className: studentSession.className,
        answers,
        submittedAt: new Date().toISOString(),
        status: 'Needs Grading'
      }
      
      const existing = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      localStorage.setItem('demo_submissions', JSON.stringify([newSubmission, ...existing]))
      
      // FIRE AND FORGET: Save to Firebase in the background so the UI doesn't freeze.
      // Because we use Next.js router.push() below, the page doesn't unload and this will safely finish in the background!
      setDoc(doc(db, "submissions", newSubmission.id), newSubmission).catch(fbErr => {
        console.warn("Firebase save warning (saved locally instead):", fbErr);
      });

      // Clear the active session
      localStorage.removeItem('demo_active_student_session')
      
      // Navigate immediately using Next.js router (keeps background requests alive)
      router.push(`/student/results/${newSubmission.id}`)
    } catch (err) {
      console.error(err)
      alert("Something went wrong saving your submission.")
      router.push('/student/join')
    }
  }

  if (blockError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-8 font-medium">{blockError}</p>
          <button 
            onClick={() => router.push('/student/join')}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Return to Portal
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    // If the router push is still processing, show a quick loading state
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Saving Submission...</h2>
      </div>
    )
  }

  if (!assessment) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No Questions Found</h2>
          <p className="text-slate-500 mb-8 font-medium">Your teacher hasn't added any questions to this assessment yet.</p>
          <button 
            onClick={() => router.push('/student/join')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
          >
            Return to Portal
          </button>
        </div>
      </div>
    )
  }

  const q = assessment.questions[currentQ]
  const isLast = currentQ === assessment.questions.length - 1
  const isFirst = currentQ === 0

  // Calculate current section
  // Find the most recent section break before or at currentQ
  let currentSectionTitle = ''
  for (let i = currentQ; i >= 0; i--) {
    if (assessment.questions[i].type === 'SECTION_BREAK') {
      currentSectionTitle = assessment.questions[i].content || 'New Section';
      break;
    }
  }

  // Count real questions (ignore section breaks) for display
  const totalQuestions = assessment.questions.filter((q: any) => q.type !== 'SECTION_BREAK').length
  
  let qNum = 1;
  for (let i = 0; i < currentQ; i++) {
    if (assessment.questions[i].type !== 'SECTION_BREAK') qNum++;
  }
  const displayQNum = q.type === 'SECTION_BREAK' ? '-' : qNum;

  const headerFormat = assessment.headerFormat || {
    date: new Date().toLocaleDateString(),
    grade: assessment.grade || 'Unknown',
    subject: 'Physics',
    duration: `${assessment.timeLimitMinutes || 0} mins`,
    note: assessment.instructions || 'Calculator is NOT allowed during the quiz.',
    campus: 'Stadium, #20, St. 598C, Phnom Penh Thmey, Sen Sok',
    maxScore: assessment.questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0).toString(),
    quizId: assessment.title || 'Quiz'
  }

  const studentName = studentSession?.studentName || 'Student'

  return (
    <div 
      className="max-w-4xl mx-auto py-8 select-none" 
      onContextMenu={(e) => {
        e.preventDefault()
        // Optional: show a small toast or ignore
      }}
    >
      
      {/* Header & Timer */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6 flex items-center justify-between sticky top-4 z-50">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{assessment.title}</h1>
          <p className="text-sm text-slate-500">
            {q.type === 'SECTION_BREAK' ? 'Section Break' : `Question ${displayQNum} of ${totalQuestions}`}
          </p>
        </div>
        
        <TimerDisplay 
          initialSeconds={assessment.timeLimitMinutes * 60} 
          onExpire={handleSubmit} 
          isPaused={submitted} 
        />

      </div>

      {/* Progress Bar */}
      <div className="flex space-x-2 mb-8">
        {assessment.questions.map((_: any, idx: number) => (
          <button 
            key={idx}
            onClick={() => setCurrentQ(idx)}
            className={`flex-1 h-2 rounded-full transition-colors ${
              idx === currentQ ? 'bg-indigo-600' : 
              answers[assessment.questions[idx].id] ? 'bg-green-400' : 'bg-slate-200 hover:bg-slate-300'
            }`}
            title={`Question ${idx + 1}`}
          />
        ))}
      </div>

      {/* Official Document Header (Paper Layout) - Shows only on first question to set the mood! */}
      {currentQ === 0 && assessment.showHeader !== false && (
        <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-slate-300 mb-8 font-serif text-black relative select-none">
          <div className="absolute top-2 right-4 text-xs text-slate-400 font-sans italic">Official Paper Header Format</div>
          
          <div className="flex justify-between items-start mt-4">
            {/* Left Column Fields */}
            <div className="space-y-3 text-[15px] flex-1 max-w-md">
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Date:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.date}</span>
              </div>
              
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Student's name:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{studentName}</span>
              </div>
              
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Grade:</span>
                <span className="border-b-[1.5px] border-dotted border-black w-32 outline-none bg-transparent text-center">{headerFormat.grade}</span>
                <span className="font-bold mx-2 whitespace-nowrap">Subject:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1 min-w-0">{headerFormat.subject}</span>
              </div>
              
              <div className="flex items-end">
                <span className="font-bold mr-2">Duration:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.duration}</span>
              </div>
              
              <div className="flex items-end">
                <span className="font-bold mr-2">Note:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.note}</span>
              </div>
              
              <div className="flex items-end">
                <span className="font-bold mr-2">Campus:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.campus}</span>
              </div>
            </div>

            {/* Middle Column Logo Placeholder */}
            <div className="flex flex-col items-center justify-start px-4">
              <img 
                src={headerFormat.logoUrl || "https://static.wixstatic.com/media/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png/v1/fill/w_200,h_200,al_c/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png"} 
                alt="School Logo" 
                className="w-28 h-28 object-contain mb-1 bg-white"
              />
            </div>

            {/* Right Column Total Score */}
            <div className="flex flex-col items-center justify-start w-32 pt-2">
              <span className="font-bold mb-2">Total Score</span>
              <div className="w-20 h-20 rounded-full border-2 border-black flex flex-col relative overflow-hidden">
                <div className="flex-1 border-b-2 border-black"></div>
                <div className="flex-1 flex items-center justify-center bg-white">
                  <span className="w-full text-center outline-none bg-transparent font-serif text-lg">{headerFormat.maxScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dashed Divider & Quiz ID */}
          <div className="border-t-[3px] border-dashed border-black w-full mt-6 mb-2"></div>
          <div className="text-center w-full flex justify-center">
            <span className="font-bold underline text-center outline-none bg-transparent text-lg font-serif min-w-[150px]">{headerFormat.quizId}</span>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-8 min-h-[400px]">
        {q.type === 'SECTION_BREAK' ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
            <h2 className="text-3xl font-bold text-indigo-900 mb-4">{q.content || 'New Section'}</h2>
            <p className="text-slate-500 mb-8">You have reached a new section. Click Next to continue.</p>
          </div>
        ) : (
          <>
            {currentSectionTitle && (
              <div className="mb-6 border-b border-slate-100 pb-4">
                <span className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm uppercase tracking-wider rounded-full shadow-sm">
                  {currentSectionTitle}
                </span>
              </div>
            )}
            
            {q.imageUrl && (
              <div className="mb-6">
                <img src={q.imageUrl} alt="Question figure" className="max-w-full h-auto max-h-96 rounded-lg border border-slate-200 shadow-sm" />
              </div>
            )}
            
            <div className="flex items-start mb-8">
              <div 
                className="prose max-w-none text-slate-800 text-lg flex-1"
                dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.content) }}
              />
              {q.isRequired && (
                <span className="text-red-500 font-bold text-2xl ml-2 shrink-0 leading-none" title="Required">*</span>
              )}
            </div>

            {/* Input area based on type */}
            {q.type === 'MCQ' && q.options && (() => {
              const isMulti = Array.isArray(q.correctAnswer) && q.correctAnswer.length > 1;
              return (
                <div className="space-y-4">
                  {isMulti && <div className="text-sm font-semibold text-indigo-600 mb-2 tracking-wide">Select all that apply:</div>}
                  {q.options.map((opt: any) => {
                    const isSelected = isMulti 
                      ? (Array.isArray(answers[q.id]) && answers[q.id].includes(opt.id))
                      : answers[q.id] === opt.id;
                    
                    return (
                      <div 
                        key={opt.id} 
                        onClick={() => {
                          if (isMulti) {
                            const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                            if (current.includes(opt.id)) {
                              handleAnswer(q.id, current.filter((id: string) => id !== opt.id));
                            } else {
                              handleAnswer(q.id, [...current, opt.id]);
                            }
                          } else {
                            handleAnswer(q.id, opt.id);
                          }
                        }}
                        className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-indigo-600 bg-indigo-50' 
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-6 h-6 flex items-center justify-center mr-4 shrink-0 transition-colors ${
                          isMulti ? 'rounded-md' : 'rounded-full'
                        } border-2 ${
                          isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}>
                          {isSelected && (
                            isMulti 
                              ? <CheckCircle2 className="w-4 h-4 text-white" /> 
                              : <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          )}
                        </div>
                        <div 
                          className="text-slate-800 font-medium text-lg pointer-events-none w-full text-justify [&>*]:m-0" 
                          dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(opt.text) }} 
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })()}

        {q.type === 'FILL_IN_BLANK' && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Your Answer:</h4>
            <MathEditor 
              value={answers[q.id] || ''} 
              onChange={(val) => handleAnswer(q.id, val)} 
              placeholder="Type the missing word or use the Math Box for equations"
              minHeight="60px"
            />
          </div>
        )}

        {q.type === 'SHORT_ANSWER' && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Type your answer:</h4>
            <MathEditor 
              value={answers[q.id]?.text || ''} 
              onChange={(val) => handleAnswer(q.id, { ...answers[q.id], text: val })} 
              placeholder="Type your explanation or short answer here..."
              minHeight="120px"
            />
          </div>
        )}

        {q.type === 'PHYSICS_CALCULATION' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Type your solution:</h4>
              <MathEditor 
                value={answers[q.id]?.text || ''} 
                onChange={(val) => handleAnswer(q.id, { ...answers[q.id], text: val })} 
                placeholder="Show your work here..."
                minHeight="250px"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-slate-500 uppercase tracking-widest">OR / AND</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Upload handwritten worksheet:</h4>
              {answers[q.id]?.image ? (
                <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col items-center p-2">
                   <img src={answers[q.id].image} alt="Uploaded worksheet" className="max-h-64 object-contain" />
                   <button 
                     onClick={() => handleAnswer(q.id, { ...answers[q.id], image: null })}
                     className="absolute top-2 right-2 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                     title="Remove image"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                   </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors relative overflow-hidden group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-indigo-500 transition-colors" />
                    <p className="mb-2 text-sm text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">Click to upload image (JPG, PNG)</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleAnswer(q.id, { ...answers[q.id], image: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {q.type === 'MATCHING' && q.pairs && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-slate-700 mb-6">Match the words in part A with the correct definition or corresponding phrase in part B as following:</h4>
            
            {/* Headers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3 bg-slate-100 rounded-t-xl gap-4 border-b-2 border-slate-200">
              <div className="font-bold text-slate-800 text-sm uppercase tracking-wider flex-1">
                Part A
              </div>
              <div className="hidden sm:block w-8"></div>
              <div className="font-bold text-slate-800 text-sm uppercase tracking-wider flex-1">
                Part B
              </div>
            </div>

            <div className="space-y-3 mt-0">
              {q.pairs.map((pair: any) => (
                <div key={pair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50 gap-4 hover:border-indigo-300 transition-colors">
                  <div 
                    className="font-bold text-slate-800 text-base flex-1 pl-2 pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(pair.left) }}
                  />
                  <div className="text-slate-400 hidden sm:block w-8 text-center">→</div>
                  <div className="flex-1">
                    <MatchingSelect
                      value={answers[q.id]?.[pair.id] || ''}
                      onChange={(val: string) => handleAnswer(q.id, { ...(answers[q.id] || {}), [pair.id]: val })}
                      placeholder="Select match..."
                      options={q.shuffledRightOptions || [...q.pairs].map((p: any) => p.right).sort()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => setCurrentQ(prev => prev - 1)}
          disabled={isFirst}
          className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center"
        >
          <ChevronLeft className="w-5 h-5 mr-1" /> Previous
        </button>

        {!isLast ? (
          <button 
            onClick={() => setCurrentQ(prev => prev + 1)}
            className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors flex items-center"
          >
            Next <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        ) : !confirmSubmit ? (
          <button 
            onClick={() => setConfirmSubmit(true)}
            className="px-8 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-200 transition-colors flex items-center"
          >
            <Send className="w-5 h-5 mr-2" /> Submit Assessment
          </button>
        ) : (
          <button 
            onClick={() => handleSubmit()}
            className="px-8 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 transition-colors flex items-center animate-pulse"
          >
            <AlertTriangle className="w-5 h-5 mr-2" /> Confirm Final Submit
          </button>
        )}
      </div>

    </div>
  )
}
