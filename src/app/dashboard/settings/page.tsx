"use client"
import React, { useState, useEffect, useRef } from 'react'
import { User, Bell, Lock, Shield, Save, Globe, Book } from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [profile, setProfile] = useState({
    firstName: 'Mr.',
    lastName: 'Physics',
    email: 'teacher@wis.edu',
    school: 'WIS Phnom Penh',
    avatarUrl: ''
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 400
          let width = img.width
          let height = img.height

          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            // Compress heavily to ensure it fits in localStorage
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
            setProfile(prev => ({ ...prev, avatarUrl: compressedDataUrl }))
          }
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const [notifications, setNotifications] = useState({
    newSubmissions: true,
    assessmentDeadlines: true
  })

  const [defaults, setDefaults] = useState({
    defaultQuizTime: 30,
    defaultTestTime: 45,
    shuffleQuestions: true,
    shuffleOptions: true
  })

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [passwordError, setPasswordError] = useState('')

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match.")
      return
    }
    
    if (passwords.new.length < 6) {
      setPasswordError("Password must be at least 6 characters.")
      return
    }

    setIsSaving(true)
    localStorage.setItem('demo_password', passwords.new)
    
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setPasswords({ current: '', new: '', confirm: '' })
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 800)
  }

  useEffect(() => {
    const savedProfile = localStorage.getItem('demo_profile_settings')
    if (savedProfile) setProfile(JSON.parse(savedProfile))

    const savedNotifs = localStorage.getItem('demo_notifications_settings')
    if (savedNotifs) setNotifications(JSON.parse(savedNotifs))

    const savedDefaults = localStorage.getItem('demo_defaults_settings')
    if (savedDefaults) setDefaults(JSON.parse(savedDefaults))
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    // Save to localStorage
    localStorage.setItem('demo_profile_settings', JSON.stringify(profile))
    localStorage.setItem('demo_notifications_settings', JSON.stringify(notifications))
    localStorage.setItem('demo_defaults_settings', JSON.stringify(defaults))
    
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 800)
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences and application settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <User className={`w-5 h-5 mr-3 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Bell className={`w-5 h-5 mr-3 ${activeTab === 'notifications' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Notifications
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'security' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Lock className={`w-5 h-5 mr-3 ${activeTab === 'security' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Security
            </button>
            <button 
              onClick={() => setActiveTab('defaults')}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'defaults' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Book className={`w-5 h-5 mr-3 ${activeTab === 'defaults' ? 'text-indigo-600' : 'text-slate-400'}`} />
              Assessment Defaults
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Profile Information</h2>
              <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div className="flex items-center space-x-6 mb-8">
                  <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold border-4 border-white shadow-md overflow-hidden relative">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        {profile.firstName ? profile.firstName.charAt(0).toUpperCase() : 'M'}
                        {profile.lastName ? profile.lastName.charAt(0).toUpperCase() : 'P'}
                      </>
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleAvatarChange} 
                    />
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      Change Avatar
                    </button>
                    <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Auto-compressed.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={profile.firstName} 
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={profile.lastName} 
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email} 
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">School / Institution</label>
                    <input 
                      type="text" 
                      value={profile.school} 
                      onChange={(e) => setProfile({...profile, school: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end items-center">
                  {saveSuccess && <span className="text-green-600 font-medium mr-4">Saved!</span>}
                  <button type="submit" disabled={isSaving} className={`px-6 py-2.5 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg shadow-md transition-colors flex items-center disabled:opacity-70`}>
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Email Notifications</h2>
              <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input id="notify-sub" type="checkbox" checked={notifications.newSubmissions} onChange={(e) => setNotifications({...notifications, newSubmissions: e.target.checked})} className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500" />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notify-sub" className="font-medium text-slate-700">New Submissions</label>
                      <p className="text-slate-500">Get notified when a student submits an assessment late.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input id="notify-grade" type="checkbox" checked={notifications.assessmentDeadlines} onChange={(e) => setNotifications({...notifications, assessmentDeadlines: e.target.checked})} className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500" />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notify-grade" className="font-medium text-slate-700">Assessment Deadlines</label>
                      <p className="text-slate-500">Daily digest of upcoming assessment deadlines for your classes.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end items-center">
                  {saveSuccess && <span className="text-green-600 font-medium mr-4">Saved!</span>}
                  <button type="submit" disabled={isSaving} className={`px-6 py-2.5 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg shadow-md transition-colors flex items-center disabled:opacity-70`}>
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Security Settings</h2>
              <form onSubmit={handleSavePassword} className="space-y-6 max-w-2xl">
                
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
                    <input 
                      type="password" 
                      value={passwords.current}
                      onChange={e => setPasswords({...passwords, current: e.target.value})}
                      placeholder="Enter current password" 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                    <input 
                      type="password" 
                      value={passwords.new}
                      onChange={e => setPasswords({...passwords, new: e.target.value})}
                      placeholder="Enter new password (min. 6 characters)" 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={passwords.confirm}
                      onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                      placeholder="Confirm new password" 
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" 
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-end items-center">
                  {saveSuccess && <span className="text-green-600 font-medium mr-4">Password Updated!</span>}
                  <button type="submit" disabled={isSaving} className={`px-6 py-2.5 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg shadow-md transition-colors flex items-center disabled:opacity-70`}>
                    <Lock className="w-4 h-4 mr-2" /> {isSaving ? 'Updating...' : saveSuccess ? 'Saved' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Defaults Tab */}
          {activeTab === 'defaults' && (
            <div className="p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Assessment Defaults</h2>
              <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Default Quiz Time (mins)</label>
                    <input type="number" value={defaults.defaultQuizTime} onChange={(e) => setDefaults({...defaults, defaultQuizTime: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Default Test Time (mins)</label>
                    <input type="number" value={defaults.defaultTestTime} onChange={(e) => setDefaults({...defaults, defaultTestTime: Number(e.target.value)})} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600" />
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <h4 className="font-semibold text-slate-800">Security Defaults</h4>
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Shuffle Questions Automatically</p>
                      <p className="text-xs text-slate-500">Apply to all new quizzes and tests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={defaults.shuffleQuestions} onChange={(e) => setDefaults({...defaults, shuffleQuestions: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-800 text-sm">Shuffle Multiple Choice Options</p>
                      <p className="text-xs text-slate-500">Prevent cheating by randomizing options A, B, C, D</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={defaults.shuffleOptions} onChange={(e) => setDefaults({...defaults, shuffleOptions: e.target.checked})} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 flex justify-end items-center">
                  {saveSuccess && <span className="text-green-600 font-medium mr-4">Saved!</span>}
                  <button type="submit" disabled={isSaving} className={`px-6 py-2.5 ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg shadow-md transition-colors flex items-center disabled:opacity-70`}>
                    <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Defaults'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
