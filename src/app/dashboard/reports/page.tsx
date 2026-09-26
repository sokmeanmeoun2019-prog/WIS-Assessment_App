"use client"
import React, { useState, useEffect } from 'react'
import { BarChart, Download, Filter, TrendingUp, Users, Award, FileSpreadsheet, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase'
import { doc, deleteDoc } from 'firebase/firestore'
// Dummy Data
const dummyGrades = [
  { id: 1, student: 'John Doe', class: 'Class A', grade: 'Grade 9', assessment: 'Kinematics Quiz', score: 85, date: '2026-09-24' },
  { id: 2, student: 'Alice Smith', class: 'Class A', grade: 'Grade 9', assessment: 'Kinematics Quiz', score: 92, date: '2026-09-24' },
  { id: 3, student: 'Bob Johnson', class: 'Class A', grade: 'Grade 9', assessment: 'Kinematics Quiz', score: 78, date: '2026-09-25' },
  { id: 4, student: 'Sarah Connor', class: 'Class B', grade: 'Grade 10', assessment: 'Dynamics Monthly Test', score: 95, date: '2026-09-20' },
  { id: 5, student: 'Tom Hanks', class: 'Class B', grade: 'Grade 10', assessment: 'Dynamics Monthly Test', score: 64, date: '2026-09-20' },
]

export default function ReportsPage() {
  const [grades, setGrades] = useState(dummyGrades)
  const [filterClass, setFilterClass] = useState('All')

  // Merge localStorage graded submissions if any exist
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      const gradedLocal = stored
        .filter((s: any) => s.status === 'Graded')
        .map((s: any, idx: number) => ({
          id: `local-${s.id || idx}`,
          student: s.studentName,
          class: s.studentId || s.className || 'Unknown', // The studentId field was repurposed to Class
          grade: 'Physics',
          assessment: s.assessmentTitle,
          score: s.score || 100,
          date: new Date(s.submittedAt).toISOString().split('T')[0]
        }))
      
      if (gradedLocal.length > 0) {
        setGrades([...gradedLocal, ...dummyGrades])
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // Automatically derive the list of unique classes from the data to populate the filter dropdown
  const uniqueClasses = Array.from(new Set(grades.map(g => g.class))).sort()

  const filteredGrades = (filterClass === 'All' ? grades : grades.filter(g => g.class === filterClass))
    .sort((a, b) => {
      const classA = a.class.toUpperCase();
      const classB = b.class.toUpperCase();
      if (classA < classB) return -1;
      if (classA > classB) return 1;
      
      const nameA = a.student.toUpperCase();
      const nameB = b.student.toUpperCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      
      return 0;
    });

  const averageScore = Math.round(filteredGrades.reduce((acc, curr) => acc + curr.score, 0) / (filteredGrades.length || 1))
  const highestScore = Math.max(...filteredGrades.map(g => g.score), 0)

  const handleDelete = async (id: string | number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this student's score?");
    if (!confirmDelete) return;

    if (typeof id === 'string' && id.startsWith('local-')) {
      const realId = id.replace('local-', '');
      
      // Remove from localStorage
      const stored = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      const updated = stored.filter((s: any) => s.id !== realId)
      localStorage.setItem('demo_submissions', JSON.stringify(updated))
      
      // Remove from current state
      setGrades(grades.filter(g => g.id !== id))
      
      // Remove from firebase
      try {
        await deleteDoc(doc(db, "submissions", realId));
      } catch(e) {}
    } else {
      // It's a dummy grade, just remove from state
      setGrades(grades.filter(g => g.id !== id))
    }
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Student Name', 'Class', 'Grade', 'Assessment', 'Date Graded', 'Score (%)'];
    const rows = filteredGrades.map(g => [
      `"${g.student}"`, 
      `"${g.class}"`, 
      `"${g.grade}"`, 
      `"${g.assessment}"`, 
      `"${g.date}"`, 
      g.score
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Physics_Assessment_Results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Results & Reports</h1>
          <p className="text-slate-500 mt-1">Analyze student performance and export gradebooks.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-bold shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" /> Export to Excel
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <BarChart className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Class Average</p>
            <h3 className="text-3xl font-bold text-slate-800">{averageScore}%</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Highest Score</p>
            <h3 className="text-3xl font-bold text-slate-800">{highestScore}%</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Graded</p>
            <h3 className="text-3xl font-bold text-slate-800">{filteredGrades.length}</h3>
          </div>
        </div>
      </div>

      {/* Gradebook Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Recent Assessment Scores</h2>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 outline-none"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="All">All Classes</option>
              {uniqueClasses.map((cls: any) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold">Student Name</th>
                <th scope="col" className="px-6 py-4 font-bold">Class & Grade</th>
                <th scope="col" className="px-6 py-4 font-bold">Assessment</th>
                <th scope="col" className="px-6 py-4 font-bold">Date Graded</th>
                <th scope="col" className="px-6 py-4 font-bold">Score</th>
                <th scope="col" className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No results found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredGrades.map((g) => (
                  <tr key={g.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mr-3 font-bold text-xs">
                        {g.student.split(' ').map(n => n[0]).join('')}
                      </div>
                      {g.student}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold mr-2">{g.class}</span>
                      <span className="text-slate-500 text-xs">{g.grade}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {g.assessment}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {g.date}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        g.score >= 90 ? 'text-green-600' :
                        g.score >= 75 ? 'text-blue-600' :
                        g.score >= 60 ? 'text-orange-500' : 'text-red-600'
                      }`}>
                        {g.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(g.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
