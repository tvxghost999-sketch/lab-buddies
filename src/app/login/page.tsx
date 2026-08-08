'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail, Lock, Zap } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';

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
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : `http://${window.location.hostname}:5000`);
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
    <div className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      {/* Header */}
      <header className="border-b-[3px] border-neo-dark bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:scale-95 transition-all flex items-center h-full relative z-10">
            <img src="/logo.png" alt="Lab Buddies Logo" className="h-18 sm:h-22 w-auto object-contain max-h-none scale-105 origin-left" />
          </Link>
          <Link href="/signup">
            <Button variant="white" size="sm">
              Sign Up
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <Card variant="white" className="max-w-md w-full p-8 border-[4px] shadow-[6px_6px_0_0_#111111] flex flex-col gap-6">
          
          <div className="text-center flex flex-col gap-1.5">
            <h1 className="font-archivo text-2xl uppercase text-neo-dark">Welcome Back</h1>
            <p className="text-xs font-bold text-neo-dark/65">
              Log in to manage your profile and view verification states.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Email */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-black uppercase text-neo-dark/80 tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-neo-dark/50" />
                </span>
                <input
                  type="email"
                  placeholder="name@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="neo-input w-full text-xs font-semibold"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-black uppercase text-neo-dark/80 tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-neo-dark/50" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="neo-input w-full text-xs font-semibold"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" variant="yellow" size="lg" className="w-full gap-2 mt-2" disabled={loading}>
              <span>{loading ? 'Logging in...' : 'Log In'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

          </form>

          <div className="text-center text-xs font-bold text-neo-dark/60 mt-2">
            <span>Don't have an account? </span>
            <Link href="/signup" className="text-neo-orange hover:underline">
              Create an account
            </Link>
          </div>

        </Card>
      </main>
    </div>
  );
}
