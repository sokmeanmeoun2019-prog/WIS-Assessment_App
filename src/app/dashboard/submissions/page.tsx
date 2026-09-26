"use client"
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, Clock, ChevronDown, ChevronUp, User, FileText, Check, Pencil, Eraser, X, Save, Undo, Trash2 } from 'lucide-react'
import 'katex/dist/katex.min.css'
import { db, auth } from '@/lib/firebase'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'

// Helper to robustly compare HTML answers containing <math-field> tags
const normalizeAnswer = (html: string | undefined) => {
  if (!html) return ''
  let text = html.replace(/<math-field[^>]*value="([^"]*)"[^>]*>.*?<\/math-field>/gi, '$1')
  text = text.replace(/<math-field[^>]*>(.*?)<\/math-field>/gi, '$1')
  text = text.replace(/<[^>]*>?/gm, '')
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return text.replace(/\s+/g, '').toLowerCase()
}

// Helper to make all math fields strictly read-only in the grading view
const renderReadOnlyMath = (html: string | undefined) => {
  if (!html) return ''
  return html.replace(/<math-field/g, '<math-field readonly')
}

type Point = { x: number, y: number }
type Path = { points: Point[], color: string, brushSize: number, tool: 'pen' | 'eraser' }

const ImageAnnotator = ({ imageUrl, onSave, onCancel }: { imageUrl: string, onSave: (url: string) => void, onCancel: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ef4444') // Red
  const brushSize = 3
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  
  const [paths, setPaths] = useState<Path[]>([])
  const [currentPath, setCurrentPath] = useState<Path | null>(null)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [canvasDim, setCanvasDim] = useState({ w: 800, h: 600 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      const maxWidth = 800
      const maxHeight = 600
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w)
        w = maxWidth
      }
      if (h > maxHeight) {
        w = Math.round((w * maxHeight) / h)
        h = maxHeight
      }
      setCanvasDim({ w, h })
      setBgImage(img)
    }
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bgImage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set actual canvas size
    canvas.width = canvasDim.w
    canvas.height = canvasDim.h
    
    // Draw base layer
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
    
    // Create offscreen canvas for strokes
    const offCanvas = document.createElement('canvas')
    offCanvas.width = canvas.width
    offCanvas.height = canvas.height
    const offCtx = offCanvas.getContext('2d')
    if (!offCtx) return
    
    const drawPath = (p: Path) => {
      if (p.points.length === 0) return
      offCtx.beginPath()
      offCtx.moveTo(p.points[0].x, p.points[0].y)
      offCtx.globalCompositeOperation = p.tool === 'eraser' ? 'destination-out' : 'source-over'
      offCtx.strokeStyle = p.color
      offCtx.lineWidth = p.tool === 'eraser' ? 20 : p.brushSize
      offCtx.lineCap = 'round'
      offCtx.lineJoin = 'round'
      p.points.forEach(pt => offCtx.lineTo(pt.x, pt.y))
      offCtx.stroke()
    }
    
    paths.forEach(drawPath)
    if (currentPath) drawPath(currentPath)
    
    // Composite offscreen canvas onto main canvas
    ctx.drawImage(offCanvas, 0, 0)
    
  }, [paths, currentPath, bgImage, canvasDim])

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    const pt = getCoordinates(e)
    setCurrentPath({
      tool,
      color,
      brushSize,
      points: [pt]
    })
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !currentPath) return
    const pt = getCoordinates(e)
    setCurrentPath({
      ...currentPath,
      points: [...currentPath.points, pt]
    })
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPath) {
      setPaths([...paths, currentPath])
      setCurrentPath(null)
    }
  }
  
  const handleUndo = () => {
    setPaths(paths.slice(0, -1))
  }
  
  const handleClear = () => {
    setPaths([])
  }

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/jpeg', 0.8))
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] max-w-5xl w-full">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center">
            <Pencil className="w-5 h-5 mr-2 text-indigo-600" />
            Grade Worksheet
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <button onClick={() => setTool('pen')} className={`p-2 rounded-md ${tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Pen">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => setTool('eraser')} className={`p-2 rounded-md ${tool === 'eraser' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Eraser">
                <Eraser className="w-4 h-4" />
              </button>
            </div>
            
            {tool === 'pen' && (
              <div className="flex items-center gap-2 px-3 border-l border-slate-200">
                {['#ef4444', '#22c55e', '#3b82f6', '#000000'].map(c => (
                  <button 
                    key={c} 
                    onClick={() => setColor(c)} 
                    className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 px-3 border-l border-slate-200">
              <button 
                onClick={handleUndo} 
                disabled={paths.length === 0}
                className={`p-2 rounded-md flex items-center font-medium text-sm ${paths.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Undo Last Stroke"
              >
                <Undo className="w-4 h-4 mr-1.5" /> Undo
              </button>
              <button 
                onClick={handleClear} 
                disabled={paths.length === 0}
                className={`p-2 rounded-md flex items-center font-medium text-sm ${paths.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
                title="Clear All Annotations"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Clear All
              </button>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 bg-slate-100 flex-1 overflow-auto flex items-center justify-center touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="shadow-md rounded border border-slate-300 bg-white cursor-crosshair max-w-full max-h-full object-contain touch-none"
            style={{ touchAction: 'none' }}
          />
        </div>
        
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
          <button onClick={onCancel} className="px-5 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center transition-colors shadow-sm">
            <Save className="w-4 h-4 mr-2" />
            Save Annotations
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [assessments, setAssessments] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Annotation state
  const [annotatingImage, setAnnotatingImage] = useState<{ subId: string, qId: string, url: string } | null>(null)
  
  // Load from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        let storedAssessments = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        let storedSubmissions = JSON.parse(localStorage.getItem('demo_submissions') || '[]')

        // Sort local submissions
        storedSubmissions.sort((a: any, b: any) => {
          const classA = (a.className || a.studentId || '').toUpperCase();
          const classB = (b.className || b.studentId || '').toUpperCase();
          if (classA < classB) return -1;
          if (classA > classB) return 1;
          return 0;
        });

        // Optimistic UI: Immediately show what we have in local storage!
        if (storedAssessments.length > 0) setAssessments(storedAssessments);
        if (storedSubmissions.length > 0) setSubmissions(storedSubmissions);

        try {
          // Fetch from Firebase (Background)
          const assessmentsSnap = await getDocs(collection(db, "assessments"));
          let cloudAssessments = assessmentsSnap.docs.map(doc => doc.data());
          
          // Multi-tenancy filter
          if (auth.currentUser?.uid) {
            cloudAssessments = cloudAssessments.filter(a => a.teacherId === auth.currentUser?.uid);
          }

          if (cloudAssessments.length > 0) {
            // merge
            const merged = [...storedAssessments];
            cloudAssessments.forEach(ca => {
              const idx = merged.findIndex(a => a.id === ca.id);
              if (idx >= 0) merged[idx] = ca; else merged.push(ca);
            });
            storedAssessments = merged;
            localStorage.setItem('demo_assessments', JSON.stringify(storedAssessments));
            setAssessments(storedAssessments);
          }

          const subsSnap = await getDocs(collection(db, "submissions"));
          let cloudSubs = subsSnap.docs.map(doc => doc.data());
          
          // Multi-tenancy filter for submissions (based on assessment ownership)
          if (auth.currentUser?.uid) {
            const ownedAssessmentIds = cloudAssessments.map(a => a.id);
            cloudSubs = cloudSubs.filter(s => ownedAssessmentIds.includes(s.assessmentId));
          }

          if (cloudSubs.length > 0) {
            const mergedSub = [...storedSubmissions];
            cloudSubs.forEach(cs => {
              const idx = mergedSub.findIndex(s => s.id === cs.id);
              if (idx >= 0) mergedSub[idx] = cs; else mergedSub.push(cs);
            });
            storedSubmissions = mergedSub;
            
            storedSubmissions.sort((a: any, b: any) => {
              const classA = (a.className || a.studentId || '').toUpperCase();
              const classB = (b.className || b.studentId || '').toUpperCase();
              if (classA < classB) return -1;
              if (classA > classB) return 1;
              return 0;
            });
            
            localStorage.setItem('demo_submissions', JSON.stringify(storedSubmissions));
            setSubmissions(storedSubmissions);
          }
        } catch (fbError) {
          console.warn("Firebase fetch error", fbError);
        }

        // Add a dummy submission just so the screen isn't empty if they haven't taken a test yet
        if (storedSubmissions.length === 0) {
        setSubmissions([{
          id: 'mock-sub-1',
          assessmentId: '1',
          assessmentTitle: 'Chapter 3: Kinematics Quiz',
          studentName: 'Alice Smith',
          className: 'Class A',
          status: 'Needs Grading',
          submittedAt: new Date().toISOString(),
          answers: { 'q1': 'o2' }
        }])
      } else {
        setSubmissions(storedSubmissions)
      }
    } catch (err) {
      console.error(err)
    }
  };
  loadData();
}, [])

  const handleSaveAnnotation = async (dataUrl: string) => {
    if (!annotatingImage) return;
    const { subId, qId } = annotatingImage;
    
    const updated = submissions.map((s: any) => {
      if (s.id === subId) {
        const nextAnswers = { ...s.answers }
        if (nextAnswers[qId]) {
          nextAnswers[qId] = { ...nextAnswers[qId], image: dataUrl }
        }
        return { ...s, answers: nextAnswers }
      }
      return s;
    });
    
    setSubmissions(updated);
    if (!subId.startsWith('mock-')) {
      localStorage.setItem('demo_submissions', JSON.stringify(updated));
      const targetSub = updated.find(s => s.id === subId);
      if (targetSub) {
        try {
          setDoc(doc(db, "submissions", subId), targetSub);
        } catch (err) {
          console.error("Firebase update error", err);
        }
      }
    }
    setAnnotatingImage(null);
  }

  const markAsGraded = (id: string) => {
    const updated = submissions.map(s => {
      if (s.id === id) {
        const originalAssessment = assessments.find(a => a.id === s.assessmentId)
        if (originalAssessment && originalAssessment.questions) {
          let totalPointsEarned = 0
          let totalPointsPossible = 0

          originalAssessment.questions.forEach((q: any) => {
            if (q.type === 'SECTION_BREAK') return;
            const possiblePoints = Number(q.points) || 1
            totalPointsPossible += possiblePoints
            
            // Read from the input field if the teacher manually changed it
            const inputEl = document.getElementById(`points-${s.id}-${q.id}`) as HTMLInputElement
            if (inputEl) {
              const enteredVal = Number(inputEl.value) || 0
              totalPointsEarned += Math.min(Math.max(enteredVal, 0), possiblePoints)
            } else {
              // Fallback to auto-grade if input is somehow missing
              if (q.type === 'MCQ') {
                if (s.answers?.[q.id] === q.correctAnswer) totalPointsEarned += possiblePoints
              } else if (q.type === 'FILL_IN_BLANK') {
                if (normalizeAnswer(s.answers?.[q.id]) === normalizeAnswer(q.correctAnswer)) {
                  totalPointsEarned += possiblePoints
                }
              } else if (q.type === 'MATCHING') {
                let correctPairs = 0
                if (q.pairs && q.pairs.length > 0) {
                  q.pairs.forEach((pair: any) => {
                    if (s.answers?.[q.id]?.[pair.id] === pair.right) correctPairs += 1
                  })
                  totalPointsEarned += (correctPairs / q.pairs.length) * possiblePoints
                }
              }
            }
          })
          
          const finalScorePercentage = totalPointsPossible > 0 
            ? Math.round((totalPointsEarned / totalPointsPossible) * 100) 
            : 0

          return { 
            ...s, 
            status: 'Graded', 
            score: finalScorePercentage,
            pointsEarned: totalPointsEarned,
            pointsPossible: totalPointsPossible 
          }
        }
        return { ...s, status: 'Graded', score: 0, pointsEarned: 0, pointsPossible: 0 }
      }
      return s
    })

    setSubmissions(updated)
    if (!id.startsWith('mock-')) {
      localStorage.setItem('demo_submissions', JSON.stringify(updated))
      // Push to Firebase
      const targetSub = updated.find(s => s.id === id);
      if (targetSub) {
        try {
          setDoc(doc(db, "submissions", id), targetSub);
        } catch (fbErr) {
          console.error("Firebase update error", fbErr);
        }
      }
    }
    setExpandedId(null)
  }

  return (
    <div className="max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Submissions & Grading</h1>
          <p className="text-slate-500">Review student work, grade calculations, and provide feedback.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
          <div className="col-span-2">Assessment</div>
          <div>Student</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100">
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No submissions found. Take a quiz as a student first!</div>
          ) : (
            submissions.map((sub) => (
              <div key={sub.id} className="flex flex-col">
                {/* Row */}
                <div 
                  className={`grid grid-cols-5 gap-4 p-4 items-center transition-all duration-300 cursor-pointer border-l-4 ${expandedId === sub.id ? 'bg-indigo-50/50 border-indigo-500' : 'hover:bg-slate-50 border-transparent hover:border-slate-300'}`}
                  onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                >
                  <div className="col-span-2 flex items-center">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 shadow-sm transition-colors duration-300 ${expandedId === sub.id ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-600 border border-indigo-200'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{sub.assessmentTitle}</p>
                      <p className="text-xs text-slate-500">
                        Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col justify-center text-sm font-medium text-slate-700">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {sub.studentName}
                    </div>
                    <div className="text-xs text-slate-500 ml-6 mt-0.5">
                      {sub.className || sub.studentId || 'Unknown'}
                    </div>
                  </div>

                  <div>
                    {sub.status === 'Needs Grading' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                        <Clock className="w-3 h-3 mr-1" /> Needs Grading
                      </span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 w-fit">
                          <CheckCircle className="w-3 h-3 mr-1" /> Graded
                        </span>
                        {sub.score !== undefined && (
                          <span className="mt-1 text-sm font-black text-indigo-700">
                            {sub.pointsEarned !== undefined && sub.pointsPossible !== undefined 
                              ? `Score: ${sub.pointsEarned}/${sub.pointsPossible} (${sub.score}%)`
                              : `Score: ${sub.score}%`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-indigo-600 font-medium text-sm">
                    {expandedId === sub.id ? 'Close' : 'Review'}
                    {expandedId === sub.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Grading View */}
                {expandedId === sub.id && (
                  <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Student Answers</h3>
                    
                    <div className="space-y-6">
                      {(() => {
                        const originalAssessment = assessments.find(a => a.id === sub.assessmentId)
                        if (!originalAssessment || !originalAssessment.questions) {
                          return <p className="text-slate-500 italic">Could not load original questions for this assessment.</p>
                        }

                        let qNumCounter = 1;
                        return originalAssessment.questions.map((q: any, index: number) => {
                          if (q.type === 'SECTION_BREAK') return null;
                          const currentQNum = qNumCounter++;
                          
                          const studentAnswer = sub.answers?.[q.id]
                          
                          const getDefaultPoints = () => {
                            const possible = Number(q.points) || 1
                            if (q.type === 'MCQ') {
                              const sAns = Array.isArray(studentAnswer) ? [...studentAnswer].sort().join(',') : (studentAnswer || '');
                              const cAns = Array.isArray(q.correctAnswer) ? [...q.correctAnswer].sort().join(',') : (q.correctAnswer || '');
                              return sAns === cAns ? possible : 0;
                            }
                            if (q.type === 'FILL_IN_BLANK') {
                              return normalizeAnswer(studentAnswer) === normalizeAnswer(q.correctAnswer) ? possible : 0
                            }
                            if (q.type === 'MATCHING') {
                              let correct = 0
                              if (q.pairs) {
                                q.pairs.forEach((p: any) => {
                                  if (studentAnswer?.[p.id] === p.right) correct++
                                })
                                return (correct / q.pairs.length) * possible
                              }
                            }
                            return 0 // Default to 0 for SHORT_ANSWER and PHYSICS_CALCULATION so teacher must manually award points
                          }

                          const autoPoints = Math.round(getDefaultPoints() * 10) / 10
                          
                          return (
                            <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                              <h4 className="font-bold text-slate-800 mb-2">Question {currentQNum}</h4>
                              <div className="prose max-w-none text-slate-700 text-sm mb-4" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.content) || '<em>No question text</em>' }} />
                              
                              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-800">
                                
                                {/* MCQ */}
                                {q.type === 'MCQ' && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Student Selected:</p>
                                    {(() => {
                                      const studentArr = Array.isArray(studentAnswer) ? studentAnswer : (studentAnswer ? [studentAnswer] : []);
                                      const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer ? [q.correctAnswer] : []);
                                      
                                      const isCorrect = [...studentArr].sort().join(',') === [...correctArr].sort().join(',');
                                      
                                      return (
                                        <div>
                                          {studentArr.length > 0 ? (
                                            <div className="space-y-2">
                                              {studentArr.map((ansId: string) => {
                                                const selectedOpt = q.options?.find((o: any) => o.id === ansId)
                                                return (
                                                  <div key={ansId} className={`font-medium flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                                                    {selectedOpt ? (
                                                      <span className="text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(selectedOpt.text) }} />
                                                    ) : (
                                                      <span>Unknown Option</span>
                                                    )}
                                                  </div>
                                                )
                                              })}
                                              <div className={`text-sm font-bold ${isCorrect ? 'text-green-700' : 'text-red-600'} mt-1`}>
                                                {isCorrect ? '(Correct)' : '(Incorrect)'}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-slate-400 italic">Left blank</div>
                                          )}
                                          
                                          {!isCorrect && correctArr.length > 0 && (
                                            <div className="mt-3 text-sm text-green-700 font-medium border-t border-slate-200 pt-3 flex flex-col gap-2">
                                              <span className="mb-1 text-xs uppercase tracking-wider font-bold text-slate-500">Correct Answer(s):</span>
                                              {correctArr.map((ansId: string) => {
                                                const correctOpt = q.options?.find((o: any) => o.id === ansId)
                                                return correctOpt && (
                                                  <div key={ansId} className="flex items-center gap-2">
                                                    <span className="text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(correctOpt.text) }} />
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                                
                                {/* SHORT ANSWER / PHYSICS */}
                                {(q.type === 'SHORT_ANSWER' || q.type === 'PHYSICS_CALCULATION') && (
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Typed Solution:</p>
                                      {studentAnswer?.text ? (
                                        <div 
                                          className="prose max-w-none bg-white p-4 rounded-lg border border-slate-200" 
                                          dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentAnswer.text) }} 
                                        />
                                      ) : (
                                        <div className="text-slate-400 italic">No typed solution provided.</div>
                                      )}
                                    </div>
                                    
                                    {studentAnswer?.image && (
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Uploaded Worksheet:</p>
                                          <button 
                                            onClick={() => setAnnotatingImage({ subId: sub.id, qId: q.id, url: studentAnswer.image })}
                                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center bg-indigo-50 px-2 py-1 rounded-md"
                                          >
                                            <Pencil className="w-3 h-3 mr-1" /> Annotate Image
                                          </button>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200 inline-block max-w-full overflow-hidden">
                                          <img src={studentAnswer.image} alt="Student Worksheet" className="max-w-full max-h-96 object-contain rounded-md" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* FILL IN THE BLANK */}
                                {q.type === 'FILL_IN_BLANK' && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Student Typed:</p>
                                    {(() => {
                                      const isCorrect = normalizeAnswer(studentAnswer) === normalizeAnswer(q.correctAnswer)
                                      return (
                                        <div>
                                          {studentAnswer ? (
                                            <div className={`font-medium flex items-center ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                                              <span dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentAnswer) }} />
                                              <span className="ml-2">{isCorrect ? ' (Correct)' : ' (Incorrect)'}</span>
                                            </div>
                                          ) : (
                                            <div className="text-slate-400 italic">Left blank</div>
                                          )}
                                          {!isCorrect && q.correctAnswer && (
                                            <div className="mt-2 text-sm text-green-700 font-medium border-t border-slate-200 pt-2 flex items-center">
                                              <span className="mr-2">Correct Answer:</span>
                                              <span dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.correctAnswer) }} />
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}

                                {/* MATCHING */}
                                {q.type === 'MATCHING' && (
                                  <div>
                                    <p className="text-xs text-slate-500 mb-3 uppercase font-bold tracking-wider">Matched Pairs:</p>
                                    <div className="space-y-2">
                                      {q.pairs?.map((pair: any) => {
                                        const studentMatchedWith = studentAnswer?.[pair.id]
                                        const isCorrect = studentMatchedWith === pair.right
                                        return (
                                          <div key={pair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-lg text-sm">
                                            <div className="font-semibold text-slate-700 w-1/3 text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(pair.left) }} />
                                            <div className="text-slate-400 hidden sm:block">→</div>
                                            <div className={`w-1/3 text-center font-medium ${isCorrect ? 'text-green-700' : 'text-red-600'} text-justify [&>*]:m-0`}>
                                              {studentMatchedWith ? (
                                                <span dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentMatchedWith) }} />
                                              ) : (
                                                <span className="italic text-slate-400">Not selected</span>
                                              )}
                                            </div>
                                            <div className="text-slate-400 hidden sm:block">|</div>
                                            <div className="w-1/3 text-right text-xs text-slate-500 flex flex-col items-end">
                                              <span className="block font-semibold">Correct:</span>
                                              <span className="text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(pair.right) }} />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                              </div>
                              
                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                                <div className="flex items-center space-x-2">
                                  <label className="text-sm font-medium text-slate-600">Points Awarded:</label>
                                  <input 
                                    id={`points-${sub.id}-${q.id}`}
                                    type="number"
                                    min="0"
                                    max={q.points || 1}
                                    step="0.1" 
                                    className="w-16 px-2 py-1 border border-slate-300 rounded text-center outline-none focus:border-indigo-500" 
                                    defaultValue={autoPoints} 
                                  />
                                  <span className="text-sm text-slate-500">/ {q.points || 1}</span>
                                </div>
                                <input type="text" placeholder="Add teacher feedback..." className="flex-1 ml-4 px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end">
                      <button 
                        onClick={() => markAsGraded(sub.id)}
                        className="flex items-center px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md shadow-green-200 transition-colors"
                      >
                        <Check className="w-5 h-5 mr-2" /> Publish Grade
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {annotatingImage && (
        <ImageAnnotator
          imageUrl={annotatingImage.url}
          onSave={handleSaveAnnotation}
          onCancel={() => setAnnotatingImage(null)}
        />
      )}
    </div>
  )
}
