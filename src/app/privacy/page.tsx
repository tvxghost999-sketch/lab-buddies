'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';
import Image from 'next/image';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center gap-2 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-all font-medium">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Header Block */}
        <div className="flex flex-col gap-3 mb-10">
          <div className="flex items-center gap-2">
            <span className="bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20 text-xs px-2.5 py-0.5 rounded-full">
              Privacy First
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#f4f4f5]">
            Privacy Policy
          </h1>
          <p className="text-sm text-[#71717a]">
            Last updated: August 7, 2026. Learn how we keep your collaboration private and secure.
          </p>
        </div>

        {/* Policy Content Card */}
        <div className="glass-card p-6 sm:p-10 flex flex-col gap-8">
          {/* Intro Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] border-b border-white/[0.06] pb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FF6A00]" />
              1. Our Privacy Philosophy
            </h2>
            <p className="text-sm text-[#71717a] leading-relaxed">
              At Lab Buddies, we believe your work is your own. Our platform is built on <strong className="text-[#f4f4f5] font-medium">Privacy by Design</strong>. We do not require account registration to join rooms, we do not track your real identity, and we do not store shared collaboration assets indefinitely.
            </p>
          </div>

          {/* Data Collection */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] border-b border-white/[0.06] pb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#4F7CFF]" />
              2. Information We Collect (And What We Don&apos;t)
            </h2>
            <div className="flex flex-col gap-4 text-sm text-[#71717a] leading-relaxed">
              <p>
                Because Lab Buddies is built for quick, on-the-fly student sharing, we minimize data footprint to the absolute minimum required to run the service:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong className="text-[#f4f4f5] font-medium">No Sign-up Data:</strong> Guest users do not provide emails, phone numbers, or passwords. Your nickname is entirely self-chosen and ephemeral.</li>
                <li><strong className="text-[#f4f4f5] font-medium">Collaboration Assets:</strong> Chats, code snippets, notes, and file metadata are only held in active memory or temporary store to synchronize with other room buddies.</li>
                <li><strong className="text-[#f4f4f5] font-medium">No Permanent Storage:</strong> Once a room expires (due to the room countdown timer set by the host), all messages, files, and notes linked to that room are permanently and irreversibly deleted.</li>
              </ul>
            </div>
          </div>

          {/* Cookies and Tracking */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] border-b border-white/[0.06] pb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFD600]" />
              3. Cookies and Local Storage
            </h2>
            <p className="text-sm text-[#71717a] leading-relaxed">
              We use local storage (or session cookies) solely to remember your guest profile name, active session tokens, and recently joined rooms, so you don&apos;t lose connection if you refresh your browser. We never use tracking cookies, analytics pixels, or advertisement trackers.
            </p>
          </div>

          {/* Third-party services */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] border-b border-white/[0.06] pb-2 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#22C55E]" />
              4. Third-Party Integrations
            </h2>
            <p className="text-sm text-[#71717a] leading-relaxed">
              Your files are stored securely using cloud architecture only for the duration of the room&apos;s lifespan. QR Code rendering uses standard high-contrast rendering APIs. No data is sold, packaged, or shared with advertisers or third-party brokers.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-[#f4f4f5] border-b border-white/[0.06] pb-2 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#8B5CF6]" />
              5. Contact Us
            </h2>
            <p className="text-sm text-[#71717a] leading-relaxed">
              If you have any questions or feedback about privacy in Lab Buddies, feel free to reach out to our team at <a href="mailto:hariommodi7898@gmail.com" className="text-[#4F7CFF] underline hover:text-[#7aa5ff] transition-colors">hariommodi7898@gmail.com</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-white/[0.06] bg-[#050608] py-6 select-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#71717a]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <span className="text-[#a1a1aa]">No Signups. No Downloads. Just Share.</span>
            <span className="hidden sm:inline text-white/10">|</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-[#f4f4f5] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[#f4f4f5] transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Powered by Modi Studio */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Powered by</span>
            <a 
              href="https://modistudio.online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white rounded-full pl-1 pr-3 py-1 transition-all"
            >
              <Image 
                src="/modi-studio-logo.jpg" 
                alt="Modi Studio Logo" 
                width={20}
                height={20}
                className="w-5 h-5 rounded-full object-cover" 
              />
              <span className="text-[10px] font-medium tracking-wide">
                Modi Studio
              </span>
            </a>
          </div>

          <div className="flex items-center gap-1.5 text-[#22C55E]">
            <Shield className="w-3.5 h-3.5" />
            <span>100% Private</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
