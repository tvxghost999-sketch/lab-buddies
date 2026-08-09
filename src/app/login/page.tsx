'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Lock, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';
import Image from 'next/image';
import { getBackendUrl } from '@/lib/adminAuth';

export default function LoginPage() {
  const router = useRouter();
  const addToast = useRoomStore((state) => state.addToast);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);

  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      addToast('Please input email and password.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        setLoggedInUser(data.user);
        addToast(data.message || 'Welcome back!', 'success');
        router.push('/profile');
      } else {
        addToast(data.error || 'Invalid credentials.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Server connection failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:opacity-80 transition-opacity flex items-center h-full relative z-10">
            <Image src="/logo.png?v=6" alt="Lab Buddies Logo" width={120} height={44} className="h-11 sm:h-12 w-auto object-contain my-auto" />
          </Link>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-[#a1a1aa] hover:text-[#f4f4f5] px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-6">
          
          <div className="text-center flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-[#f4f4f5]">Welcome Back</h1>
            <p className="text-xs text-[#71717a]">
              Log in to manage your profile and view verification states.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="neo-input has-icon-left w-full text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="neo-input has-icon-left w-full text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" variant="yellow" size="lg" className="w-full gap-2 mt-2 shadow-[0_0_20px_rgba(255,214,0,0.2)]" disabled={loading}>
              <span>{loading ? 'Logging in...' : 'Log In'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

          </form>

          <div className="text-center text-xs text-[#71717a] mt-2">
            <span>Don&apos;t have an account? </span>
            <Link href="/signup" className="text-[#FF6A00] hover:underline">
              Create an account
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
