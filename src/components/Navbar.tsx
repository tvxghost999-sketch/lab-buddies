'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Check } from 'lucide-react';
import Button from '@/components/ui/button';
import { useRoomStore } from '@/store/roomStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const logoutUser = useRoomStore((state) => state.logoutUser);
  const addToast = useRoomStore((state) => state.addToast);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    logoutUser();
    addToast('Logged out successfully.', 'info');
    router.push('/');
  };

  return (
    <header className="border-b-[3px] border-neo-dark bg-white sticky top-0 z-40 selection:bg-neo-yellow selection:text-neo-dark">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="hover:scale-95 transition-all flex items-center h-full relative z-10">
          <img src="/logo.png" alt="Lab Buddies Logo" className="h-18 sm:h-22 w-auto object-contain max-h-none scale-105 origin-left" />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/#features" className="text-neo-dark hover:text-neo-orange hover:underline hover:decoration-[3px] hover:underline-offset-4 hover:decoration-neo-orange font-archivo text-xs uppercase tracking-wider font-black transition-all">Features</Link>
          <Link href="/#how-it-works" className="text-neo-dark hover:text-neo-orange hover:underline hover:decoration-[3px] hover:underline-offset-4 hover:decoration-neo-orange font-archivo text-xs uppercase tracking-wider font-black transition-all">How It Works</Link>
          <Link href="/#about" className="text-neo-dark hover:text-neo-orange hover:underline hover:decoration-[3px] hover:underline-offset-4 hover:decoration-neo-orange font-archivo text-xs uppercase tracking-wider font-black transition-all">About Us</Link>
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-3">
          {isMounted && loggedInUser ? (
            <div className="flex items-center gap-3">
              <Link href="/profile">
                <div className="relative hover:scale-95 transition-all select-none">
                  <div className="w-10 h-10 rounded-full border-[2.5px] border-neo-dark bg-neo-yellow flex items-center justify-center font-archivo text-base uppercase font-black shadow-[2px_2px_0px_0px_#111111] hover:shadow-[3px_3px_0px_0px_#111111] active:shadow-[0px_0px_0px_0px_#111111] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer">
                    {loggedInUser.name ? loggedInUser.name[0] : 'U'}
                  </div>
                  {loggedInUser.isVerified && (
                    <span className="absolute -bottom-1 -right-1 bg-neo-green text-neo-dark border-[1.5px] border-neo-dark rounded-full p-0.5 flex items-center justify-center scale-90 shadow-[1px_1px_0px_0px_#111111]">
                      <Check className="w-2.5 h-2.5 stroke-[3.5px]" />
                    </span>
                  )}
                </div>
              </Link>
              {pathname !== '/' && (
                <button 
                  onClick={handleLogout} 
                  className="hidden sm:block font-archivo text-xs uppercase tracking-wider text-neo-dark px-4 py-2 hover:bg-cream rounded-md transition-colors font-black"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <button className="hidden sm:block font-archivo text-xs uppercase tracking-wider text-neo-dark px-4 py-2 hover:bg-cream rounded-md transition-colors font-black">
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <Button variant="orange" size="sm">
                  Start Free
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
