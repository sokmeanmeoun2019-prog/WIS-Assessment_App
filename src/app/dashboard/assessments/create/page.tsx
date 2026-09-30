"use client"
import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Save, Send, Settings2, GripVertical, CheckCircle2, AlertCircle, Image as ImageIcon, Loader2, Lightbulb } from 'lucide-react'
import MathEditor from '@/components/MathEditor'
import { db, auth } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'PHYSICS_CALCULATION' | 'FILE_UPLOAD' | 'MATCHING' | 'FILL_IN_BLANK' | 'SECTION_BREAK'

interface Option {
  id: string
  text: string
}

interface MatchingPair {
  id: string
  left: string
  right: string
}

interface Question {
  id: string
  type: QuestionType
  content: string
  points: number
  options: Option[]
  correctAnswer: string // ID of option or text
  pairs?: MatchingPair[]
  isRequired?: boolean
  imageUrl?: string
}

export default function CreateAssessment() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [grade, setGrade] = useState('')
  const [type, setType] = useState('QUIZ')
  const [timeLimit, setTimeLimit] = useState(30)


  const [headerState, setHeaderState] = useState({
    date: '',
    studentName: '',
    grade: '9',
    subject: 'Physics',
    duration: '30 mins',
    note: 'Calculator is NOT allowed during the quiz.',
    campus: 'Stadium, #20, St. 598C, Phnom Penh Thmey, Sen Sok',
    maxScore: '100',
    quizId: 'Quiz#1A'
  })

  // Synchronize grade and timeLimit with the digital settings
  React.useEffect(() => {
    setHeaderState(prev => ({
      ...prev,
      duration: timeLimit > 0 ? `${timeLimit} mins` : 'None',
      grade: grade.replace('Grade ', '')
    }))
  }, [timeLimit, grade])

  
  
  const [questions, setQuestions] = useState<Question[]>([
    { id: 'q1', type: 'MCQ', content: 'What is the unit of Force?', points: 1, options: [{id: 'o1', text: 'Newton'}, {id: 'o2', text: 'Joule'}], correctAnswer: 'o1' }
  ])

  React.useEffect(() => {
    if (editId) {
      try {
        const stored = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        const existing = stored.find((a: any) => a.id === editId)
        if (existing) {
          setTitle(existing.title || '')
          setInstructions(existing.instructions || '')
          setGrade(existing.grade || 'Grade 9')
          setType(existing.type || 'QUIZ')
          setTimeLimit(existing.timeLimitMinutes || 30)
          if (existing.questions && existing.questions.length > 0) {
            setQuestions(existing.questions)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoadedFromStorage(true)
      }
    } else {
      setIsLoadedFromStorage(true) // Not editing, so it's loaded
    }
  }, [editId])

  React.useEffect(() => {
    if (!editId) {
      try {
        const d = JSON.parse(localStorage.getItem('demo_defaults_settings') || 'null')
        if (d) {
          if (type === 'QUIZ') setTimeLimit(d.defaultQuizTime || 30)
          else if (type === 'MONTHLY_TEST' || type === 'SEMESTER_EXAM') setTimeLimit(d.defaultTestTime || 45)
          else setTimeLimit(0)
        } else {
          if (type === 'QUIZ') setTimeLimit(30)
          else if (type === 'MONTHLY_TEST' || type === 'SEMESTER_EXAM') setTimeLimit(45)
          else setTimeLimit(0)
        }
      } catch (err) {}
    }
  }, [type, editId])

  const [loading, setLoading] = useState(false)

  const addQuestion = (qType: QuestionType) => {
    const newId = `q${Date.now()}`
    setQuestions([...questions, { 
      id: newId, 
      type: qType, 
      content: '', 
      points: 1, 
      options: qType === 'MCQ' ? [{id: `o${Date.now()}1`, text: ''}, {id: `o${Date.now()}2`, text: ''}] : [],
      correctAnswer: '',
      pairs: qType === 'MATCHING' ? [{id: `p${Date.now()}1`, left: '', right: ''}, {id: `p${Date.now()}2`, left: '', right: ''}] : []
    }])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id))
  }

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [hoveredDragId, setHoveredDragId] = useState<string | null>(null)
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, questionId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImageId(questionId)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        const max = 800
        
        if (width > height) {
          if (width > max) {
            height = Math.round(height *= max / width)
            width = max
          }
        } else {
          if (height > max) {
            width = Math.round(width *= max / height)
            height = max
          }
        }
        
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          // Compress to JPEG to save space in Firestore (0.7 quality)
          const base64Url = canvas.toDataURL('image/jpeg', 0.7)
          updateQuestion(questionId, 'imageUrl', base64Url)
        }
        setUploadingImageId(null)
      }
      img.onerror = () => {
        alert("Failed to load image.")
        setUploadingImageId(null)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return
    const newQuestions = [...questions]
    const [draggedItem] = newQuestions.splice(draggedIndex, 1)
    newQuestions.splice(dropIndex, 0, draggedItem)
    setQuestions(newQuestions)
    setDraggedIndex(null)
    setDragOverIndex(null)
    setHoveredDragId(null)
  }

  const [titleError, setTitleError] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false)

  const [draftId] = useState(() => `local-draft-${Date.now()}`)

  // Auto-save logic
  React.useEffect(() => {
    if (editId && !isLoadedFromStorage) return; // CRITICAL: wait until existing data is loaded!
    if (!title.trim() && questions.length === 0) return; // Don't auto-save empty new assessments
    
    try {
      const existing = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
      const targetId = editId || draftId;
      
      const draftData = {
        id: targetId,
        title: title || 'Untitled Assessment',
        instructions,
        grade,
        type,
        timeLimitMinutes: timeLimit,
        headerFormat: headerState,
        questions,
        updatedAt: new Date().toISOString(),
        status: 'DRAFT'
      }

      const existingIndex = existing.findIndex((a: any) => a.id === targetId)
      if (existingIndex >= 0) {
        existing[existingIndex] = { ...existing[existingIndex], ...draftData }
      } else {
        if (!editId) {
          // It's a new draft that hasn't been explicitly saved yet, just stash it silently
          // We won't pollute the main list until they hit Save to generate a real ID, 
          // or we can just push it. Let's just push it so it shows in drafts!
          existing.unshift(draftData)
        }
      }
      
      localStorage.setItem('demo_assessments', JSON.stringify(existing))
      setLastSaved(new Date())
    } catch (err) {
      console.error('Auto-save failed', err)
    }
  }, [title, instructions, grade, type, timeLimit, headerState, questions])

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!title.trim()) {
      setTitleError(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setTitleError(false)
    
    setLoading(true)

    const targetId = editId || draftId;
    const newAssessment = {
      id: targetId,
      title,
      instructions,
      grade,
      type,
      timeLimitMinutes: timeLimit,
      headerFormat: headerState,
      questions,
      createdAt: new Date().toISOString(), // This overwrites updatedAt for new
      updatedAt: new Date().toISOString(),
      status,
      teacherId: auth.currentUser?.uid || 'legacy'
    }
    
    // Save to local storage for drafts
    const existing = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
    const existingIndex = existing.findIndex((a: any) => a.id === targetId);
    if (existingIndex >= 0) {
      existing[existingIndex] = { ...existing[existingIndex], ...newAssessment }
    } else {
      existing.unshift(newAssessment);
    }
    localStorage.setItem('demo_assessments', JSON.stringify(existing))

    // Save to Firebase! (Non-blocking so it doesn't hang the UI)
    setDoc(doc(db, "assessments", targetId), newAssessment).catch((err) => {
      console.error("Failed to save to Firebase", err);
    });

    setTimeout(() => {
      setLoading(false)
      router.push('/dashboard/assessments')
    }, 300)
  }

  const [showImportModal, setShowImportModal] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState('')
  const [showManualImport, setShowManualImport] = useState(false)
  const [manualText, setManualText] = useState('')

  const handleImportSubmit = async () => {
    setImportError('')
    if (!importUrl) return
    try {
      const res = await fetch('/api/import-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import form')
      }
      
      if (data.questions && data.questions.length > 0) {
        if (data.title) setTitle(data.title)
        setQuestions([...questions, ...data.questions])
        setShowImportModal(false)
        setShowManualImport(false)
        setImportUrl('')
        alert(`Successfully imported ${data.questions.length} questions! Note: Google Forms does not publicly expose correct answers or point values for security reasons. Please set the correct answers and points manually before publishing.`)
      } else {
        throw new Error("No questions found in this form.")
      }
      
    } catch (e: any) {
      setImportError(e.message + " If the form is private or restricted, we cannot automatically read it. Please use the Smart Text Importer below.")
      setShowManualImport(true)
    }
  }

  const handleManualImport = () => {
    if (!manualText.trim()) return;
    
    const blocks = manualText.split(/\n\s*\n/)
    const parsedQuestions: Question[] = []
    
    blocks.forEach((block) => {
      if (!block.trim()) return
      const lines = block.split('\n').map(l => l.trim()).filter(l => l)
      
      // Look for section break marker
      if (lines[0].toLowerCase().includes('section') && lines.length === 1) {
        parsedQuestions.push({
          id: 'sec_' + Math.random().toString(36).substring(7),
          type: 'SECTION_BREAK',
          content: lines[0].replace(/^\d+[\.\)]\s*/, ''),
          points: 0,
          options: [],
          correctAnswer: ''
        })
        return;
      }

      let qText = lines[0].replace(/^\d+[\.\)]\s*/, '')
      let type: QuestionType = 'SHORT_ANSWER'
      let options: Option[] = []
      let correct = ''
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (line.match(/^[a-eA-E][\.\)]\s+/) || line.match(/^[○\-*]\s+/)) {
          const optText = line.replace(/^[a-eA-E][\.\)]\s+/, '').replace(/^[○\-*]\s+/, '')
          const optId = 'opt_' + Math.random().toString(36).substring(7)
          options.push({ id: optId, text: optText })
          type = 'MCQ'
        } else if (line.toLowerCase().startsWith('answer:')) {
          const ansStr = line.split(':')[1].trim().toUpperCase()
          const charCode = ansStr.charCodeAt(0)
          if (charCode >= 65 && charCode <= 69) { 
            const index = charCode - 65
            if (options[index]) correct = options[index].id
          }
        }
      }
      
      parsedQuestions.push({
        id: 'q_' + Math.random().toString(36).substring(7),
        type: type,
        content: qText,
        points: 1,
        options: options.length > 0 ? options : [{id: 'o1', text: 'Option 1'}, {id: 'o2', text: 'Option 2'}],
        correctAnswer: correct || (options.length > 0 ? options[0].id : ''),
        isRequired: true
      })
    })

    if (parsedQuestions.length > 0) {
      setQuestions([...questions, ...parsedQuestions])
      setShowImportModal(false)
      setShowManualImport(false)
      setManualText('')
      setImportUrl('')
    }
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{editId ? 'Edit Assessment' : 'Create Assessment'}</h1>
          <p className="text-slate-500">{editId ? 'Modify your existing assessment.' : 'Design your physics quiz, test, or homework.'}</p>
          <div className="flex items-center space-x-3 mt-3">
            <div className="inline-flex items-center px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-bold border border-indigo-200 shadow-sm">
              Total Points: {questions.reduce((sum, q) => q.type === 'SECTION_BREAK' ? sum : sum + (q.points || 0), 0)}
            </div>
            {lastSaved && (
              <div className="text-xs text-slate-400 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Auto-saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 font-medium flex items-center shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Import from Google Form
          </button>
          <button 
            onClick={() => handleSave('DRAFT')}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center"
          >
            <Save className="w-4 h-4 mr-2" /> Save Draft
          </button>
          <button 
            onClick={() => handleSave('PUBLISHED')}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center shadow-md shadow-indigo-200"
          >
            <Send className="w-4 h-4 mr-2" /> Publish
          </button>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <Settings2 className="w-5 h-5 mr-2 text-indigo-500" /> Assessment Settings
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (e.target.value.trim()) setTitleError(false)
              }}
              className={`w-full px-4 py-2 rounded-lg border outline-none focus:ring-2 ${
                titleError ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-600'
              }`}
              placeholder="e.g. Chapter 3: Kinematics Quiz"
            />
            {titleError && (
              <p className="text-red-500 text-sm mt-1.5 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1"/> Please enter a title for this assessment.
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Assign to Class</label>
            <input 
              type="text" 
              value={grade} 
              onChange={e => setGrade(e.target.value)} 
              className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Type any class name (e.g. Grade 12 Science)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Assessment Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600">
              <option value="HOMEWORK">Homework</option>
              <option value="QUIZ">Quiz</option>
              <option value="MONTHLY_TEST">Monthly Test</option>
              <option value="SEMESTER_EXAM">Semester Exam</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Instructions (Optional)</label>
            <textarea 
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none resize-none h-20"
              placeholder="Write instructions for the students..."
            />
          </div>
        </div>
      </div>

      {/* Official Document Header (Paper Layout) */}
      <div className="bg-white rounded-xl p-8 shadow-sm border-2 border-slate-300 mb-8 font-serif text-black relative">
        <div className="absolute top-2 right-4 text-xs text-slate-400 font-sans italic">Official Paper Header Format</div>
        
        <div className="flex justify-between items-start mt-4">
          
          {/* Left Column Fields */}
          <div className="space-y-3 text-[15px] flex-1 max-w-md">
            <div className="flex items-end">
              <span className="font-bold mr-2 whitespace-nowrap">Date:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1 placeholder-slate-300" placeholder="dd / mm / yyyy" value={headerState.date} onChange={e => setHeaderState({...headerState, date: e.target.value})} />
            </div>
            
            <div className="flex items-end">
              <span className="font-bold mr-2 whitespace-nowrap">Student's name:</span>
              <input type="text" disabled className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1 text-slate-400" placeholder="Auto-filled by system" />
            </div>
            
            <div className="flex items-end">
              <span className="font-bold mr-2 whitespace-nowrap">Grade:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black w-32 outline-none bg-transparent text-center" value={headerState.grade} onChange={e => setHeaderState({...headerState, grade: e.target.value})} />
              <span className="font-bold mx-2 whitespace-nowrap">Subject:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1 min-w-0" value={headerState.subject} onChange={e => setHeaderState({...headerState, subject: e.target.value})} />
            </div>
            
            <div className="flex items-end">
              <span className="font-bold mr-2">Duration:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1" value={headerState.duration} onChange={e => setHeaderState({...headerState, duration: e.target.value})} />
            </div>
            
            <div className="flex items-end">
              <span className="font-bold mr-2">Note:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1" value={headerState.note} onChange={e => setHeaderState({...headerState, note: e.target.value})} />
            </div>
            
            <div className="flex items-end">
              <span className="font-bold mr-2">Campus:</span>
              <input type="text" className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1" value={headerState.campus} onChange={e => setHeaderState({...headerState, campus: e.target.value})} />
            </div>
          </div>

          {/* Middle Column Logo Placeholder */}
          <div className="flex flex-col items-center justify-start px-4">
            <img 
              src="https://static.wixstatic.com/media/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png/v1/fill/w_200,h_200,al_c/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png" 
              alt="Western International School" 
              className="w-28 h-28 object-contain mb-1"
            />
            <div className="text-center text-[11px] font-bold text-black tracking-tight leading-tight">សាលាអន្តរជាតិវេស្ទើន</div>
          </div>

          {/* Right Column Total Score */}
          <div className="flex flex-col items-center justify-start w-32 pt-2">
            <span className="font-bold mb-2">Total Score</span>
            <div className="w-20 h-20 rounded-full border-2 border-black flex flex-col relative overflow-hidden">
              <div className="flex-1 border-b-2 border-black"></div>
              <div className="flex-1 flex items-center justify-center bg-white">
                <input type="text" className="w-full text-center outline-none bg-transparent font-serif text-lg" value={headerState.maxScore} onChange={e => setHeaderState({...headerState, maxScore: e.target.value})} />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Dashed Divider & Quiz ID */}
        <div className="border-t-[3px] border-dashed border-black w-full mt-6 mb-2"></div>
        <div className="text-center w-full flex justify-center">
          <input 
            type="text" 
            className="font-bold underline text-center outline-none bg-transparent text-lg font-serif min-w-[150px]" 
            value={headerState.quizId} 
            onChange={e => setHeaderState({...headerState, quizId: e.target.value})} 
          />
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {(() => {
          let qNumCounter = 1;
          return questions.map((q, index) => {
            const isBreak = q.type === 'SECTION_BREAK';
            const currentQNum = isBreak ? null : qNumCounter++;
            
            return (
            <div 
              key={q.id}
              draggable={hoveredDragId === q.id}
              onDragStart={(e) => {
                setDraggedIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', q.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverIndex !== index) {
                  setDragOverIndex(index)
                }
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) setDragOverIndex(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(index)
              }}
              onDragEnd={() => {
                setDraggedIndex(null)
                setDragOverIndex(null)
                setHoveredDragId(null)
              }}
              className={`transition-all duration-200 ${
                draggedIndex === index ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${
                dragOverIndex === index && draggedIndex !== index
                  ? draggedIndex !== null && draggedIndex > index 
                    ? 'border-t-4 border-t-indigo-500 rounded-t-xl mt-2 pt-1'
                    : 'border-b-4 border-b-indigo-500 rounded-b-xl mb-2 pb-1' 
                  : ''
              }`}
            >
              {isBreak ? (
                <div className="bg-indigo-50 rounded-2xl p-6 shadow-sm border border-indigo-200 relative group flex items-center">
                  <div 
                    className="absolute top-4 left-2 cursor-grab text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={() => setHoveredDragId(q.id)}
                    onMouseLeave={() => setHoveredDragId(null)}
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 pl-4 flex items-center">
                    <div className="w-full">
                      <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">Section Title</label>
                      <input 
                        type="text" 
                        value={q.content} 
                        onChange={(e) => updateQuestion(q.id, 'content', e.target.value)}
                        placeholder="e.g. Part 2: Fill in the Blanks"
                        className="w-full bg-transparent text-xl font-bold text-indigo-900 outline-none border-b border-indigo-200 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                  <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600 p-2 ml-4">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group">
                  <div 
                    className="absolute top-4 left-2 cursor-grab text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={() => setHoveredDragId(q.id)}
                    onMouseLeave={() => setHoveredDragId(null)}
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="flex justify-between items-start mb-4 pl-4">
                    <h3 className="font-bold text-slate-800">Question {currentQNum}</h3>
                    <button onClick={() => removeQuestion(q.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

            <div className="pl-4">
              {q.imageUrl && (
                <div className="mb-4 relative w-fit">
                  <img src={q.imageUrl} alt="Question figure" className="max-w-full h-auto max-h-64 rounded-lg border border-slate-200" />
                  <button 
                    onClick={() => updateQuestion(q.id, 'imageUrl', '')}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <MathEditor 
                value={q.content} 
                onChange={(val) => updateQuestion(q.id, 'content', val)} 
              />
              
              <div className="mt-4">
                {q.type === 'MCQ' && (
                  <div className="space-y-3">
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center space-x-3">
                        <button 
                          onClick={() => {
                            const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer ? [q.correctAnswer] : []);
                            if (current.includes(opt.id)) {
                              const next = current.filter((id: string) => id !== opt.id);
                              updateQuestion(q.id, 'correctAnswer', next.length === 1 ? next[0] : (next.length === 0 ? '' : next));
                            } else {
                              const next = [...current, opt.id];
                              updateQuestion(q.id, 'correctAnswer', next);
                            }
                          }}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${(Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt.id) : q.correctAnswer === opt.id) ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-400'}`}
                          title="Toggle as correct answer"
                        >
                          {(Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(opt.id) : q.correctAnswer === opt.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                        <div className="flex-1">
                          <MathEditor 
                            value={opt.text}
                            onChange={(val) => {
                              const newOpts = [...q.options]
                              newOpts[oIdx].text = val
                              updateQuestion(q.id, 'options', newOpts)
                            }}
                            minHeight="40px"
                            compact={true}
                            placeholder={`Option ${oIdx + 1}`}
                          />
                        </div>
                        {q.options.length > 2 && (
                          <button 
                            onClick={() => {
                              const newOpts = q.options.filter(o => o.id !== opt.id);
                              let newCorrect = q.correctAnswer;
                              if (Array.isArray(q.correctAnswer)) {
                                newCorrect = q.correctAnswer.filter(id => id !== opt.id);
                                if (newCorrect.length === 1) newCorrect = newCorrect[0];
                                if (newCorrect.length === 0) newCorrect = '';
                              } else if (q.correctAnswer === opt.id) {
                                newCorrect = '';
                              }
                              setQuestions(questions.map(quest => 
                                quest.id === q.id ? { ...quest, options: newOpts, correctAnswer: newCorrect } : quest
                              ));
                            }}
                            className="text-slate-400 hover:text-red-500 p-2 transition-colors flex-shrink-0"
                            title="Remove Option"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!q.correctAnswer && (
                      <div className="mt-3 text-sm text-amber-600 font-medium flex items-center bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        Please set the Answer Key by clicking the circle next to the correct option.
                      </div>
                    )}
                    <button 
                      onClick={() => updateQuestion(q.id, 'options', [...q.options, {id: `o${Date.now()}`, text: ''}])}
                      className="text-sm text-indigo-600 font-medium hover:underline flex items-center mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Option
                    </button>
                  </div>
                )}

                {q.type === 'PHYSICS_CALCULATION' && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
                    Students will be able to type equations or upload an image of their handwritten worksheet for this question.
                  </div>
                )}

                {q.type === 'FILL_IN_BLANK' && (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 mt-4 space-y-3">
                    <p className="font-medium">Type your sentence in the question box above, and use <span className="bg-white px-2 py-1 rounded border font-mono">___</span> (three underscores) to represent the blank.</p>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-slate-700">Correct Answer</label>
                      <MathEditor 
                        value={q.correctAnswer || ''}
                        onChange={(val) => updateQuestion(q.id, 'correctAnswer', val)}
                        placeholder="Type the exact word or use the Math Box for equations"
                        minHeight="60px"
                      />
                    </div>
                  </div>
                )}

                {q.type === 'MATCHING' && (
                  <div className="space-y-3 mt-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Define the matching pairs (Part A and Part B):</p>
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg mb-4 flex items-start shadow-sm">
                      <span className="text-xl mr-3 leading-none">💡</span>
                      <div>
                        <strong>How to create the Answer Key:</strong> Just type the <strong>correctly matched</strong> items side-by-side in each row. <br/>
                        <span className="opacity-80">When students take the quiz, the system will automatically scramble the options on the right side. You do not need to manually mix them up or type "A, B, C" yourself!</span>
                      </div>
                    </div>
                    {q.pairs?.map((pair, pIdx) => (
                      <div key={pair.id} className="flex items-center space-x-3">
                        <div className="flex-1">
                          <MathEditor 
                            value={pair.left}
                            onChange={(val) => {
                              const newPairs = [...(q.pairs || [])]
                              newPairs[pIdx].left = val
                              updateQuestion(q.id, 'pairs', newPairs)
                            }}
                            minHeight="40px"
                            compact={true}
                            placeholder="Part A (e.g., Word)"
                          />
                        </div>
                        <div className="text-slate-400">→</div>
                        <div className="flex-1">
                          <MathEditor 
                            value={pair.right}
                            onChange={(val) => {
                              const newPairs = [...(q.pairs || [])]
                              newPairs[pIdx].right = val
                              updateQuestion(q.id, 'pairs', newPairs)
                            }}
                            minHeight="40px"
                            compact={true}
                            placeholder="Part B (e.g., Definition)"
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newPairs = q.pairs?.filter((_, idx) => idx !== pIdx)
                            updateQuestion(q.id, 'pairs', newPairs)
                          }}
                          className="text-red-400 hover:text-red-600 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newPairs = [...(q.pairs || []), { id: `p${Date.now()}`, left: '', right: '' }]
                        updateQuestion(q.id, 'pairs', newPairs)
                      }}
                      className="text-sm text-indigo-600 font-medium hover:underline flex items-center mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Matching Pair
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-slate-100 gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-500">Points:</span>
                    <input 
                      type="number" 
                      value={q.points} 
                      onChange={(e) => updateQuestion(q.id, 'points', Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-slate-300 rounded outline-none text-center" 
                      min="1"
                    />
                  </div>
                  
                  <div className="h-4 w-px bg-slate-300"></div>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={q.isRequired || false} onChange={(e) => updateQuestion(q.id, 'isRequired', e.target.checked)} />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${q.isRequired ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${q.isRequired ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600">Required</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-lg cursor-pointer transition-colors">
                    {uploadingImageId === q.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4 mr-2" />
                    )}
                    {q.imageUrl ? 'Change Image' : 'Add Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, q.id)}
                      disabled={uploadingImageId === q.id}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
              )}
          </div>
        )})})()}
      </div>

      {/* Add Question Floating Bar */}
      <div className="mt-8 bg-slate-100 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center">
        <h3 className="text-slate-600 font-medium mb-4">Add a new question</h3>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => addQuestion('MCQ')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 shadow-sm transition-all flex items-center">
             Multiple Choice
          </button>
          <button onClick={() => addQuestion('SHORT_ANSWER')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 shadow-sm transition-all flex items-center">
             Short Answer
          </button>
          <button onClick={() => addQuestion('PHYSICS_CALCULATION')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 shadow-sm transition-all flex items-center">
             Physics Calculation (with upload)
          </button>
          <button onClick={() => addQuestion('MATCHING')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 shadow-sm transition-all flex items-center">
             Matching Question
          </button>
          <button onClick={() => addQuestion('FILL_IN_BLANK')} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600 shadow-sm transition-all flex items-center">
             Fill in the Blank
          </button>
          <div className="w-px bg-slate-300 mx-2"></div>
          <button onClick={() => addQuestion('SECTION_BREAK')} className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700 hover:bg-indigo-100 shadow-sm transition-all flex items-center">
             + Add Section Break
          </button>
        </div>
      </div>

    {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-green-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Import from Google Form
              </h2>
              <button onClick={() => { setShowImportModal(false); setShowManualImport(false); }} className="text-slate-400 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {!showManualImport ? (
                <div className="space-y-6">
                  <p className="text-slate-600">Paste your Google Form URL below to automatically import questions.</p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Google Form URL</label>
                    <input 
                      type="url" 
                      value={importUrl}
                      onChange={e => setImportUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/e/1FAIpQL..." 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                  </div>
                  
                  {importError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start text-red-700 text-sm">
                      <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                      <p>{importError}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={handleImportSubmit} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-colors">Attempt Import</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <h3 className="font-bold text-blue-800 flex items-center mb-2">
                      <Lightbulb className="w-5 h-5 mr-2" /> Smart Text Importer
                    </h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Copy the text from your Google Form (or any document) and paste it below. Separate questions with an empty line.
                    </p>
                    <div className="text-xs text-blue-600 bg-blue-100/50 p-3 rounded-lg font-mono">
                      1. What is the unit of Force?<br/>
                      A) Newton<br/>
                      B) Joule<br/>
                      Answer: A<br/>
                      <br/>
                      2. Explain Newton's laws. (Short Answer)
                    </div>
                  </div>
                  
                  <textarea 
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    placeholder="Paste your questions here..."
                    className="w-full h-64 p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
                  />
                  
                  <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                    <button onClick={() => setShowImportModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={handleManualImport} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md transition-colors">Import Questions</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
