"use client"
import Link from 'next/link'
import { ArrowRight, BookOpen, Atom, Activity, GraduationCap, Lightbulb } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-indigo-900/30 to-transparent -z-10 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none -z-10"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] -z-10 pointer-events-none"></div>

      <div className="max-w-5xl w-full px-6 py-20 flex flex-col items-center text-center z-10">
        
        {/* Giant Centered Logo */}
        <div className="flex flex-col items-center justify-center mb-16 text-center">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-blue-500 rounded-[2rem] flex items-center justify-center mb-6 sm:mb-8 shadow-[0_0_50px_-10px_rgba(59,130,246,0.6)] relative z-10">
            <Lightbulb className="w-12 h-12 sm:w-16 sm:h-16 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight leading-[1.1] drop-shadow-lg">
            WIS<br/>Assessments
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center">
          <Link href="/login?role=teacher" className="flex-1 bg-white hover:bg-indigo-50 text-indigo-950 px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] transition-all duration-300 flex items-center justify-center group border border-transparent">
            Teacher Login
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/student/join" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-slate-700 hover:border-blue-500/50 group">
            <GraduationCap className="mr-2 w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
            Student Login
          </Link>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-6 mt-8 pb-20 z-10">
        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all group">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-3">Rich Assessments</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Create beautiful quizzes and tests with our built-in Math Equation Editor and seamless grading rubrics.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-3">Smart Grading</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Review student submissions efficiently, verify physics calculations step-by-step, and leave targeted feedback.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all group">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Atom className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-200 mb-3">Class Security</h3>
          <p className="text-slate-400 leading-relaxed text-sm">Ensure academic integrity with randomized questions, strict deadlines, and class-specific access codes.</p>
        </div>
      </div>
    </main>
  )
}
