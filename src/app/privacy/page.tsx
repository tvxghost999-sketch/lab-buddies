'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, FileText, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-cream">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center gap-2 font-archivo text-xs uppercase tracking-wider text-neo-dark hover:translate-x-[-2px] transition-all font-black">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </Link>
        </div>

        {/* Header Block */}
        <div className="flex flex-col gap-3 mb-10">
          <div className="flex items-center gap-2">
            <span className="bg-neo-green text-neo-dark font-archivo text-xs px-2.5 py-0.5 border-[2px] border-neo-dark rounded shadow-neo-sm font-black uppercase tracking-wide">
              Privacy First
            </span>
          </div>
          <h1 className="font-archivo text-3xl sm:text-4xl uppercase text-neo-dark">
            Privacy Policy
          </h1>
          <p className="text-sm font-bold text-neo-dark/70">
            Last updated: August 7, 2026. Learn how we keep your collaboration private and secure.
          </p>
        </div>

        {/* Policy Content Card */}
        <Card variant="white" className="p-6 sm:p-10 flex flex-col gap-8 border-[3px] shadow-neo">
          {/* Intro Section */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-neo-orange" />
              1. Our Privacy Philosophy
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              At Lab Buddies, we believe your work is your own. Our platform is built on <strong>Privacy by Design</strong>. We do not require account registration to join rooms, we do not track your real identity, and we do not store shared collaboration assets indefinitely.
            </p>
          </div>

          {/* Data Collection */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Lock className="w-5 h-5 text-neo-blue" />
              2. Information We Collect (And What We Don't)
            </h2>
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              <p>
                Because Lab Buddies is built for quick, on-the-fly student sharing, we minimize data footprint to the absolute minimum required to run the service:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li><strong>No Sign-up Data:</strong> Guest users do not provide emails, phone numbers, or passwords. Your nickname is entirely self-chosen and ephemeral.</li>
                <li><strong>Collaboration Assets:</strong> Chats, code snippets, notes, and file metadata are only held in active memory or temporary store to synchronize with other room buddies.</li>
                <li><strong>No Permanent Storage:</strong> Once a room expires (due to the room countdown timer set by the host), all messages, files, and notes linked to that room are permanently and irreversibly deleted.</li>
              </ul>
            </div>
          </div>

          {/* Cookies and Tracking */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-neo-yellow" />
              3. Cookies and Local Storage
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              We use local storage (or session cookies) solely to remember your guest profile name, active session tokens, and recently joined rooms, so you don't lose connection if you refresh your browser. We never use tracking cookies, analytics pixels, or advertisement trackers.
            </p>
          </div>

          {/* Third-party services */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-neo-green" />
              4. Third-Party Integrations
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              Your files are stored securely using cloud architecture only for the duration of the room's lifespan. QR Code rendering uses standard high-contrast rendering APIs. No data is sold, packaged, or shared with advertisers or third-party brokers.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Lock className="w-5 h-5 text-neo-purple" />
              5. Contact Us
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              If you have any questions or feedback about privacy in Lab Buddies, feel free to reach out to our team at <a href="mailto:hariommodi7898@gmail.com" className="text-neo-blue underline">hariommodi7898@gmail.com</a>.
            </p>
          </div>
        </Card>
      </main>

      {/* Footer bar */}
      <footer className="border-t-[3px] border-neo-dark bg-white py-6 select-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 font-archivo text-xs uppercase tracking-wider text-neo-dark font-black">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <span>No Signups. No Downloads. Just Share.</span>
            <span className="hidden sm:inline text-neo-dark/30">|</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-neo-orange hover:underline transition-all text-neo-dark/70">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-neo-orange hover:underline transition-all text-neo-dark/70">Terms of Service</Link>
            </div>
          </div>

          {/* Powered by Modi Studio */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neo-dark/50">Powered by</span>
            <a 
              href="https://modistudio.online" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-neo-dark text-white rounded-full pl-1 pr-3 py-1 shadow-neo-sm hover:translate-y-[-1px] transition-all cursor-pointer select-none active:translate-y-0 active:shadow-neo-sm"
            >
              <img 
                src="/modi-studio-logo.jpg" 
                alt="Modi Studio Logo" 
                className="w-5 h-5 rounded-full object-cover border border-white/20" 
              />
              <span className="font-archivo text-[9.5px] uppercase font-black tracking-wide text-white">
                Modi Studio
              </span>
            </a>
          </div>

          <div className="flex items-center gap-1.5 text-neo-green">
            <Shield className="w-4 h-4 text-neo-green fill-neo-green/10" />
            <span>100% Private</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
