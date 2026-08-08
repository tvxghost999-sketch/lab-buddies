'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Check, LogOut, User } from 'lucide-react';
import Button from '@/components/ui/button';
import { useRoomStore } from '@/store/roomStore';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const logoutUser = useRoomStore((state) => state.logoutUser);
  const addToast = useRoomStore((state) => state.addToast);

  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logoutUser();
    addToast('Logged out successfully.', 'info');
    router.push('/');
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#050608]/90 backdrop-blur-xl border-b border-white/[0.08]'
          : 'bg-transparent border-b border-white/[0.05]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity flex items-center h-full relative z-10">
          <Image
            src="/logo.png?v=3"
            alt="Lab Buddies logo - anonymous student file sharing platform"
            width={150}
            height={48}
            priority
            className="h-12 sm:h-14 w-auto object-contain my-auto"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: '/#features', label: 'Features' },
            { href: '/#how-it-works', label: 'How It Works' },
            { href: '/#about', label: 'About' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[#a1a1aa] hover:text-[#f4f4f5] text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/[0.06] transition-all"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          {isMounted && loggedInUser ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <div className="relative hover:opacity-80 transition-opacity select-none cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-[#FFD600]/15 border border-[#FFD600]/30 flex items-center justify-center text-[#FFD600] text-sm font-bold uppercase">
                    {loggedInUser.name ? loggedInUser.name[0] : 'U'}
                  </div>
                  {loggedInUser.isVerified && (
                    <span className="absolute -bottom-0.5 -right-0.5 bg-[#22C55E] text-white rounded-full p-0.5 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3px]" />
                    </span>
                  )}
                </div>
              </Link>
              {pathname !== '/' && (
                <button
                  onClick={handleLogout}
                  className="hidden sm:flex items-center gap-1.5 text-[#71717a] hover:text-[#f4f4f5] text-sm px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="hidden sm:block text-[#a1a1aa] hover:text-[#f4f4f5] text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/[0.06] transition-all">
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <Button variant="yellow" size="sm">
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
