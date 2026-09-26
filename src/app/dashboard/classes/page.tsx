"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, UserPlus, BookOpen, MoreVertical, Plus, GraduationCap, Pencil, Trash2 } from 'lucide-react'

// Dummy data for classes
const initialClasses = [
  { id: 1, name: 'Class A', grade: 'Grade 9', students: 32, subject: 'Physics' },
  { id: 2, name: 'Class B', grade: 'Grade 9', students: 28, subject: 'Physics' },
  { id: 3, name: 'Class A', grade: 'Grade 10', students: 30, subject: 'Physics' },
  { id: 4, name: 'Class C', grade: 'Grade 11', students: 25, subject: 'Physics' },
  { id: 5, name: 'Advanced Physics', grade: 'Grade 12', students: 18, subject: 'Physics' }
]

export default function MyClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  
  // State for form
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newGrade, setNewGrade] = useState('Grade 9')
  const [newName, setNewName] = useState('')
  const [newStudents, setNewStudents] = useState<number>(0)
  const [newSubject, setNewSubject] = useState('Physics')

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('demo_classes')
    if (saved) {
      setClasses(JSON.parse(saved))
    } else {
      setClasses(initialClasses)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('demo_classes', JSON.stringify(classes))
    }
  }, [classes, isLoaded])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const openCreateModal = () => {
    setEditingId(null)
    setNewName('')
    setNewGrade('Grade 9')
    setNewStudents(0)
    setNewSubject('Physics')
    setIsModalOpen(true)
  }

  const openEditModal = (cls: any) => {
    setEditingId(cls.id)
    setNewName(cls.name)
    setNewGrade(cls.grade)
    setNewStudents(cls.students || 0)
    setNewSubject(cls.subject || 'Physics')
    setIsModalOpen(true)
  }

  const handleDeleteClass = (id: number) => {
    setClasses(classes.filter(c => c.id !== id))
  }

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    if (editingId) {
      // Edit mode
      setClasses(classes.map(c => 
        c.id === editingId ? { ...c, name: newName, grade: newGrade, students: newStudents, subject: newSubject } : c
      ))
    } else {
      // Create mode
      const newClass = {
        id: Date.now(),
        name: newName,
        grade: newGrade,
        students: newStudents,
        subject: newSubject
      }
      setClasses([newClass, ...classes])
    }
    
    setIsModalOpen(false)
  }

  if (!isLoaded) return null;

  return (
    <div className="max-w-7xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Classes</h1>
          <p className="text-slate-500 mt-1">Manage your class sections and student rosters.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-200 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" /> Create Class
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-visible flex flex-col">
            
            {/* Card Header */}
            <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 p-6 relative rounded-t-2xl">
              
              <div className="absolute top-4 right-4 flex space-x-2">
                <button 
                  onClick={() => openEditModal(cls)}
                  className="text-white/80 hover:text-white p-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors tooltip"
                  title="Edit Class"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteClass(cls.id)}
                  className="text-white/80 hover:text-red-300 p-1.5 bg-white/10 hover:bg-red-500/20 rounded-md transition-colors tooltip"
                  title="Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-white/80 font-medium text-sm mb-1">{cls.grade}</div>
              <h2 className="text-xl font-bold text-white tracking-tight">{cls.name}</h2>
            </div>

            {/* Card Body */}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-slate-600 mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mr-3">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Students</p>
                    <p className="font-semibold text-slate-800">{cls.students}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mr-3">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject</p>
                    <p className="font-semibold text-slate-800">{cls.subject}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto space-y-3">
                <Link href="/dashboard/assessments" className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 hover:border-indigo-200 font-medium transition-colors flex items-center justify-center text-sm">
                  <BookOpen className="w-4 h-4 mr-2" /> View Assessments
                </Link>
                <button onClick={() => openEditModal(cls)} className="w-full py-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 hover:border-indigo-200 font-medium transition-colors flex items-center justify-center text-sm">
                  <UserPlus className="w-4 h-4 mr-2" /> Add Students
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Modal Overlay for Creating/Editing a Class */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Class' : 'Create New Class'}
              </h2>
            </div>
            
            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Grade Level</label>
                <select 
                  value={newGrade} 
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                >
                  <option>Grade 9</option>
                  <option>Grade 10</option>
                  <option>Grade 11</option>
                  <option>Grade 12</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Class Name / Section</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Class C, Morning Section"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Number of Students</label>
                  <input 
                    type="number" 
                    value={newStudents}
                    onChange={(e) => setNewStudents(Number(e.target.value))}
                    min="0"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Subject</label>
                  <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Physics"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 mt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-md shadow-indigo-200"
                >
                  {editingId ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
