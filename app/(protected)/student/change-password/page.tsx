"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getToken } from "@/lib/api"
import { Shield, Key, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react"
import { useAuthStore } from "@/lib/store"

export default function ChangePasswordPage() {
  const router = useRouter()
  const setUser = useAuthStore(state => state.setUser)
  const user = useAuthStore(state => state.user)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  
  useEffect(() => {
    // Read from localStorage to ensure we have the latest
    try {
      const stored = localStorage.getItem("userInfo")
      if (stored) {
        const u = JSON.parse(stored)
        setIsFirstLogin(!!u.is_first_login)
      }
    } catch(e) {}
  }, [])
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setError("All fields are required")
    }

    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters")
    }

    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match")
    }

    setLoading(true)

    try {
      // Direct fetch to backend since it requires token
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
      const res = await fetch(`${BACKEND_URL}/auth/student/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        
        // Update local storage to reflect that is_first_login is now false
        try {
          const stored = localStorage.getItem("userInfo")
          if (stored) {
            const u = JSON.parse(stored)
            u.is_first_login = false
            localStorage.setItem("userInfo", JSON.stringify(u))
            setUser(u) // Update store
          }
        } catch (e) {
          console.error(e)
        }

        // Redirect after short delay
        setTimeout(() => {
          router.replace("/student/dashboard")
        }, 1500)
      } else {
        setError(data.message || "Failed to change password")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Updated</h2>
          <p className="text-gray-500">Redirecting you to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 relative">
        {!isFirstLogin && (
          <button 
            onClick={() => router.push("/student/dashboard")}
            className="absolute top-4 left-4 text-white/80 hover:text-white z-10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center text-white relative">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">
            {isFirstLogin ? "Secure Your Account" : "Change Password"}
          </h1>
          <p className="text-blue-100 mt-1 text-sm">
            {isFirstLogin ? "Please change your default password" : "Keep your account secure"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isFirstLogin && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
              <p>For your security, you must change your auto-generated password before accessing your dashboard.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <Key className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter current password"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <Shield className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Shield className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mt-6 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Updating..." : "Update Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}
