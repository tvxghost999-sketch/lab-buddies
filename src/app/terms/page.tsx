'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Scale, Shield, AlertTriangle, CheckSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';

export default function TermsConditions() {
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
            <span className="bg-neo-yellow text-neo-dark font-archivo text-xs px-2.5 py-0.5 border-[2px] border-neo-dark rounded shadow-neo-sm font-black uppercase tracking-wide">
              Legal Rules
            </span>
          </div>
          <h1 className="font-archivo text-3xl sm:text-4xl uppercase text-neo-dark">
            Terms & Conditions
          </h1>
          <p className="text-sm font-bold text-neo-dark/70">
            Last updated: August 7, 2026. Please read these terms carefully before creating or joining rooms.
          </p>
        </div>

        {/* Terms Content Card */}
        <Card variant="white" className="p-6 sm:p-10 flex flex-col gap-8 border-[3px] shadow-neo">
          {/* Agreement */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Scale className="w-5 h-5 text-neo-orange" />
              1. Acceptance of Terms
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              By accessing or using Lab Buddies, you agree to comply with and be bound by these Terms & Conditions. If you do not agree to these terms, you must not access, create, or join any rooms on our platform.
            </p>
          </div>

          {/* User Code of Conduct */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-neo-red" />
              2. Acceptable Use Policy
            </h2>
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              <p>
                Lab Buddies is built to facilitate student learning, collaboration, and rapid code or note sharing. You agree NOT to use the service for:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-2">
                <li>Sharing illegal content, malware, spyware, viruses, or copy-protected assets without appropriate rights.</li>
                <li>Harassing, spamming, or sending abusive messages to other buddies inside rooms.</li>
                <li>Disrupting the service or attempting unauthorized access to rooms or backend socket streams.</li>
              </ul>
            </div>
          </div>

          {/* Academic Integrity */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Scale className="w-5 h-5 text-neo-orange" />
              3. Academic Integrity & Honor Codes
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              Lab Buddies is designed as an interactive tool for peer study collaboration. You agree to use this platform in accordance with the academic policies, codes of conduct, and honor codes of your educational institution. We do not condone, support, or accept liability for cheating, plagiarism, examination leakage, or any other academic integrity violations committed using the services.
            </p>
          </div>

          {/* DMCA Safe Harbor */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-neo-red" />
              4. User-Generated Content & DMCA Safe Harbor
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              All code snippets, text, and files are user-generated. We act as a passive conduit for ephemeral file-sharing and real-time messaging, and do not pre-screen uploads. We comply with copyright laws (including the Digital Millennium Copyright Act - DMCA). If you believe your copyrighted work is being shared on our platform without authorization, contact us immediately at <a href="mailto:hariommodi7898@gmail.com" className="text-neo-blue underline">hariommodi7898@gmail.com</a> with details, and we will promptly delete the corresponding room.
            </p>
          </div>

          {/* Ephemeral Rooms */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Shield className="w-5 h-5 text-neo-green" />
              5. Room Expiration and Data Deletion
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              You acknowledge that Lab Buddies provides ephemeral collaboration. The host of a room determines its duration. Upon expiration of the room timer, all data associated with that room (messages, files, snippets) is immediately, permanently, and irreversibly deleted. We are not responsible for any data loss resulting from room expiration.
            </p>
          </div>

          {/* Disclaimers & Indemnification */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-neo-blue" />
              6. Limitation of Liability & Indemnification
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              To the maximum extent permitted by law, Lab Buddies and its operators shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service, including data loss, academic suspension or penalties, server downtime, or copyright infringement by users. You agree to indemnify and hold harmless Lab Buddies from any claims, damages, or liabilities arising out of your misuse of the platform.
            </p>
          </div>

          {/* Updates to Terms */}
          <div className="flex flex-col gap-3">
            <h2 className="font-archivo text-lg uppercase text-neo-dark border-b-[2px] border-neo-dark pb-1.5 flex items-center gap-2">
              <Scale className="w-5 h-5 text-neo-purple" />
              7. Changes to Terms
            </h2>
            <p className="text-xs sm:text-sm font-bold text-neo-dark/80 leading-relaxed">
              We reserve the right to modify or replace these Terms & Conditions at any time. Changes will be posted directly on this page, and your continued use of the service constitutes acceptance of the new terms.
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
