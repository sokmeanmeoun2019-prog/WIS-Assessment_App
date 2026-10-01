"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Users, BookOpen, PlusCircle, 
  ClipboardList, CheckSquare, BarChart, Settings, LogOut, Atom, Lightbulb
} from 'lucide-react'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const sidebarLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Classes', href: '/dashboard/classes', icon: Users },
  { name: 'Create Assessment', href: '/dashboard/assessments/create', icon: PlusCircle },
  { name: 'Assessments', href: '/dashboard/assessments', icon: BookOpen },
  { name: 'Submissions & Grading', href: '/dashboard/submissions', icon: CheckSquare },
  { name: 'Results & Reports', href: '/dashboard/reports', icon: BarChart },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading your workspace...</div>
  }

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
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-gradient-to-b from-[#0a1128] via-[#121b3a] to-[#0a1128] text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Decorative background blurs */}
        <div className="absolute top-0 left-0 w-full h-40 bg-blue-600/20 blur-[50px] -z-10" />
        <div className="absolute bottom-0 right-0 w-full h-40 bg-indigo-600/20 blur-[50px] -z-10" />

        <div className="p-6 border-b border-white/10 relative flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-blue-500/30 transform hover:scale-105 transition-transform duration-300">
            <Lightbulb className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 tracking-tight leading-tight">
            MyAssessments
          </h2>
          <button 
            className="lg:hidden text-slate-400 hover:text-white p-2 absolute top-4 right-4"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 relative">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            
            const isExact = pathname === link.href
            const isSubPath = link.href !== '/dashboard' && pathname.startsWith(link.href + '/')
            let isActive = isExact || isSubPath
            
            if (link.href === '/dashboard/assessments' && pathname.startsWith('/dashboard/assessments/create')) {
              isActive = false
            }

            return (
              <Link 
                key={link.name} 
                href={link.href}
                prefetch={true}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-in-out ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/50 transform scale-[1.02]' 
                    : 'hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
              >
                <div className={`mr-4 p-2 rounded-lg transition-colors duration-300 ${isActive ? 'bg-white/20' : 'bg-transparent group-hover:bg-white/10'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-blue-300 group-hover:text-blue-200'}`} />
                </div>
                {link.name}
              </Link>
            )
          })}
        </div>

        <div className="p-4 border-t border-white/10 relative">
          <button 
            onClick={async () => {
              // Sign out of Firebase
              await auth.signOut();
              // Clear the local cache so the next person doesn't see your data
              localStorage.removeItem('demo_assessments');
              localStorage.removeItem('demo_sessions');
              localStorage.removeItem('demo_submissions');
              window.location.href = '/login';
            }} 
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-bold rounded-xl bg-white/5 hover:bg-rose-500 hover:text-white transition-all duration-300 text-rose-300 border border-transparent hover:border-rose-400/50 hover:shadow-lg hover:shadow-rose-500/20"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
        <div className="absolute inset-0 z-0 bg-slate-50/50" />

        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-8 z-10 shadow-sm sticky top-0">
          <div className="flex items-center">
            <button 
              className="lg:hidden mr-4 p-2 -ml-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500">Teacher Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 shadow-sm hover:shadow-md transition-shadow hover:scale-105 transform duration-200">
              T
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 relative z-10 scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  )
}
