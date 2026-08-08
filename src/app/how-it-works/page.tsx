'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowRight, PlusCircle, Share2, Users, Flame } from 'lucide-react';
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
      // Title
      gsap.from('.gsap-title', {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });

      // Steps animate alternately left/right on scroll
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
      icon: <PlusCircle className="w-8 h-8 text-neo-dark" />,
      color: "white" as const,
      colorTag: "bg-neo-yellow"
    },
    {
      number: "02",
      title: "Share the Credentials",
      description: "Copy the 6-digit room PIN or show the generated QR Code on your screen. Share it with your friends, classmates, or project buddies. There are no registration links or passwords; they just need the PIN to connect.",
      icon: <Share2 className="w-8 h-8 text-neo-dark" />,
      color: "cream" as const,
      colorTag: "bg-neo-orange"
    },
    {
      number: "03",
      title: "Approve & Collaborate",
      description: "As the host, you receive a floating entry notification when buddies knock to join. Click 'Accept' to let them enter. Once inside, everyone can upload physical files, write text chat messages, share C++/JS snippets, and organize sticky notes on a shared wall.",
      icon: <Users className="w-8 h-8 text-white" />,
      color: "purple" as const,
      colorTag: "bg-white text-neo-dark"
    },
    {
      number: "04",
      title: "Automatic Self-Destruct",
      description: "Keep your details completely private. As soon as the host's configured countdown timer expires, the server triggers an automated scrub. The room status changes to 'Expired', clearing the chat feed, physical files, sticky notes, and room history from memory.",
      icon: <Flame className="w-8 h-8 text-neo-dark" />,
      color: "white" as const,
      colorTag: "bg-neo-red text-white"
    }
  ];

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-12">
        
        {/* Title */}
        <div className="gsap-title flex flex-col gap-3 items-center text-center">
          <span className="bg-neo-blue text-white font-archivo text-xs uppercase tracking-wider px-3 py-1 border-[2.5px] border-neo-dark rounded-full shadow-neo-sm font-black">
            System Guide
          </span>
          <h1 className="font-archivo text-3xl sm:text-5xl uppercase text-neo-dark max-w-3xl leading-tight">
            How Lab Buddies Works
          </h1>
          <p className="text-sm font-bold text-neo-dark/70 max-w-xl">
            A secure, zero-friction path to temporary student collaborations. Learn how we handle rooms in 4 simple steps.
          </p>
        </div>

        {/* Steps Flow (Vertical Timeline style layout) */}
        <div className="flex flex-col gap-8 mt-6">
          {steps.map((step, idx) => (
            <div key={idx} className="gsap-step">
              <Card variant={step.color} className="p-6 md:p-8 border-[3px] shadow-neo-sm hover:shadow-neo transition-all">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  
                  {/* Number Badge */}
                  <div className={`w-14 h-14 rounded-full border-[3px] border-neo-dark flex items-center justify-center font-archivo text-xl font-black flex-shrink-0 shadow-neo-sm select-none ${step.colorTag}`}>
                    {step.number}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 flex flex-col gap-2 text-left">
                    <h3 className="font-archivo text-base sm:text-lg uppercase text-neo-dark tracking-wide flex items-center gap-2">
                      <span className="w-8 h-8 rounded bg-cream border-[2px] border-neo-dark flex items-center justify-center scale-90">
                        {step.icon}
                      </span>
                      {step.title}
                    </h3>
                    <p className={`text-xs font-semibold leading-relaxed ${
                      step.color === 'purple' ? 'text-white/85' : 'text-neo-dark/70'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Action Call block */}
        <div className="flex justify-center gap-4 mt-8">
          <Link href="/create">
            <Button variant="orange" size="lg" className="border-[3px] shadow-[3px_3px_0_0_#111111] hover:shadow-[5px_5px_0_0_#111111]">
              Start a Room Now
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
