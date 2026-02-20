"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client" // Keep for email/password if still used
import { createClient } from "@/utils/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"

export default function SignIn() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const signIn = async () => {
        setLoading(true)
        await authClient.signIn.email({
            email,
            password,
            callbackURL: "/onboarding", // redirect to onboarding after sign in
        }, {
            onRequest: () => {
              setLoading(true)
            },
            onSuccess: () => {
              router.push("/onboarding")
            },
            onError: (ctx) => {
              alert(ctx.error.message)
              setLoading(false)
            }
        })
    }
    
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 text-slate-900 p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md p-6 md:p-8 bg-white rounded-xl border border-slate-200 shadow-xl space-y-6"
            >
                <h1 className="text-2xl font-bold text-center text-slate-900">Sign In to CharacterOS</h1>
                
                <div className="space-y-4">
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                            const supabase = createClient()
                            await supabase.auth.signInWithOAuth({
                                provider: "google",
                                options: {
                                    redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
                                },
                            })
                        }}
                        className="w-full bg-white text-slate-700 border border-slate-300 font-medium py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                    </motion.button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <input 
                                type="email" 
                                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <input 
                                type="password" 
                                className="input w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-primary transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={signIn}
                        disabled={loading}
                        className="btn-primary w-full"
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                    
                    <p className="text-center text-sm text-slate-500">
                    <Link href="/sign-up" className="text-primary hover:underline font-medium">Sign Up</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
