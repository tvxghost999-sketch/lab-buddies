'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/button';
import { useRoomStore } from '@/store/roomStore';
import { getBackendUrl, setAdminAuth } from '@/lib/adminAuth';

export default function AdminGateLoginPage() {
  const router = useRouter();
  const addToast = useRoomStore((state) => state.addToast);
  const setLoggedInUser = useRoomStore((state) => state.setLoggedInUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const BACKEND_URL = getBackendUrl();

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Login failed. Invalid credentials.');
        addToast(data.error || 'Invalid credentials.', 'error');
        setIsLoading(false);
        return;
      }

      if (data.user.role !== 'admin') {
        setErrorMessage('Access Denied: This account has "user" role. Admin privileges required.');
        addToast('Admin role required.', 'error');
        setIsLoading(false);
        return;
      }

      // Store authenticated admin user and cryptographic JWT token
      setAdminAuth(data.user, data.token);
      setLoggedInUser(data.user);
      addToast('Welcome Admin!', 'success');
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setErrorMessage('Server connection error. Please ensure backend server is running.');
      addToast('Server error.', 'error');
    } finally {
      setIsLoading(false);
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
              Back to Home
            </button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 border border-white/[0.09] shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col gap-6">
            
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FFD600]/15 border border-[#FFD600]/30 flex items-center justify-center text-[#FFD600] mb-2 shadow-[0_0_20px_rgba(255,214,0,0.2)]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#f4f4f5]">Admin Portal</h1>
              <p className="text-xs text-[#71717a]">
                Sign in with your verified Admin credentials to access the master control panel.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/25 text-[#EF4444] text-xs flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Admin Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#71717a] absolute left-3.5 pointer-events-none z-10" />
                  <input
                    type="email"
                    required
                    placeholder="admin@labbuddies.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="neo-input has-icon-left w-full text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-[#71717a] absolute left-3.5 pointer-events-none z-10" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="neo-input has-icon-left w-full text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="yellow"
                size="lg"
                disabled={isLoading}
                className="w-full justify-center gap-2 mt-2 font-bold shadow-[0_0_20px_rgba(255,214,0,0.25)]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate as Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

          </div>
        </div>
      </main>
    </div>
  );
}
