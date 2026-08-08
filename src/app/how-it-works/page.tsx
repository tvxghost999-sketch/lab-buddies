'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowRight, PlusCircle, Share2, Users, Flame, BookOpen } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HowItWorksPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return;

    const ctx = gsap.context(() => {
      gsap.from('.gsap-title', {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });

      gsap.utils.toArray('.gsap-step').forEach((step: any, index) => {
        const isEven = index % 2 === 0;
        gsap.from(step, {
          x: isEven ? -100 : 100,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 85%'
          }
        });
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const steps = [
    {
      number: "01",
      title: "Create a Room",
      description: "Hit the 'Create Room' button. Choose a dynamic name for your workspace, set the max participant limit (up to 100 members), and configure an auto-delete self-destruct timer (from 30 minutes up to 24 hours). We will instantly spawn a room PIN in the database.",
      icon: <PlusCircle className="w-5 h-5" />,
      accent: "#FFD600"
    },
    {
      number: "02",
      title: "Share the Credentials",
      description: "Copy the 6-digit room PIN or show the generated QR Code on your screen. Share it with your friends, classmates, or project buddies. There are no registration links or passwords; they just need the PIN to connect.",
      icon: <Share2 className="w-5 h-5" />,
      accent: "#FF6A00"
    },
    {
      number: "03",
      title: "Approve & Collaborate",
      description: "As the host, you receive a floating entry notification when buddies knock to join. Click 'Accept' to let them enter. Once inside, everyone can upload physical files, write text chat messages, share code snippets, and organize sticky notes on a shared wall.",
      icon: <Users className="w-5 h-5" />,
      accent: "#8B5CF6"
    },
    {
      number: "04",
      title: "Automatic Self-Destruct",
      description: "Keep your details completely private. As soon as the host's configured countdown timer expires, the server triggers an automated scrub. The room status changes to 'Expired', clearing the chat feed, physical files, sticky notes, and room history from memory.",
      icon: <Flame className="w-5 h-5" />,
      accent: "#EF4444"
    }
  ];

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-12 relative z-10">
        
        {/* Title */}
        <div className="gsap-title flex flex-col gap-3 items-center text-center">
          <span className="bg-[#4F7CFF]/15 text-[#4F7CFF] border border-[#4F7CFF]/25 text-xs font-medium px-3.5 py-1.5 rounded-full">
            System Guide
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#f4f4f5] max-w-3xl leading-tight">
            How Lab Buddies Works
          </h1>
          <p className="text-sm text-[#71717a] max-w-xl">
            A secure, zero-friction path to temporary student collaborations. Learn how we handle rooms in 4 simple steps.
          </p>
        </div>

        {/* Steps Flow (Vertical Timeline style layout) */}
        <div className="flex flex-col gap-4 mt-6">
          {steps.map((step, idx) => (
            <div key={idx} className="gsap-step">
              <div className="glass-card p-6 md:p-8 hover:border-white/15 transition-all">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Number Badge */}
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl flex-shrink-0"
                    style={{ background: `${step.accent}15`, border: `1px solid ${step.accent}25`, color: step.accent }}
                  >
                    {step.number}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col gap-1.5 text-left">
                    <h3 className="text-sm font-semibold text-[#f4f4f5] flex items-center gap-2">
                      <span style={{ color: step.accent }}>{step.icon}</span>
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#71717a] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Call block */}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/create">
            <Button variant="orange" size="lg" className="shadow-[0_0_20px_rgba(255,106,0,0.15)]">
              Start a Room Now
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
