'use client';

import React, { useEffect, useRef } from 'react';
import { Target, Compass, BookOpen, GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutPage() {
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

      // Grid items
      gsap.from('.gsap-about-card', {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.gsap-about-grid',
          start: 'top 85%'
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const values = [
    {
      title: "Zero-Friction Access",
      desc: "Collaboration should start instantly. We cut out registration walls, authentication screens, and emails. Enter a study room in two clicks.",
      icon: <Compass className="w-8 h-8 text-neo-dark" />,
      color: "white" as const
    },
    {
      title: "Privacy by Design",
      desc: "We don't sell your data. File shared are ephemeral. Room, logs, chats, and documents self-destruct from the servers as soon as your timer completes.",
      icon: <Target className="w-8 h-8 text-neo-dark" />,
      color: "cream" as const
    },
    {
      title: "Built for Students",
      desc: "Built for labs, study grids, hackathons, and lectures. Simple features tailored specifically to code compiling, PDF reviewing, and exam note mapping.",
      icon: <GraduationCap className="w-8 h-8 text-white" />,
      color: "purple" as const
    }
  ];

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-cream selection:bg-neo-yellow selection:text-neo-dark">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-12 text-center">
        
        {/* Title */}
        <div className="gsap-title flex flex-col gap-3 items-center">
          <span className="bg-neo-purple text-white font-archivo text-xs uppercase tracking-wider px-3 py-1 border-[2.5px] border-neo-dark rounded-full shadow-neo-sm font-black">
            Our Mission
          </span>
          <h1 className="font-archivo text-3xl sm:text-5xl uppercase text-neo-dark max-w-3xl leading-tight">
            Designed to Connect Classmates
          </h1>
          <p className="text-sm font-bold text-neo-dark/70 max-w-xl">
            We believe study resources should be shared instantly, privately, and seamlessly. Learn what drives our product.
          </p>
        </div>

        {/* Story Section */}
        <Card variant="white" className="p-8 md:p-12 text-left border-[3px] shadow-neo flex flex-col gap-6 mt-4">
          <div className="flex items-center gap-2 border-b-[2.5px] border-neo-dark pb-3 select-none">
            <BookOpen className="w-6 h-6 text-neo-orange" />
            <h2 className="font-archivo text-base sm:text-lg uppercase text-neo-dark tracking-wide">
              The Story behind "Lab Buddies"
            </h2>
          </div>
          <div className="flex flex-col gap-4 text-xs font-semibold text-neo-dark/75 leading-relaxed">
            <p>
              During computer lab lectures and group study sessions, sharing code scripts, PDF slides, and terminal stack outputs was incredibly frustrating. Emailing files felt archaic, setting up GitHub repos for simple debugging code took too much time, and using common messaging boards leaked personal emails or phone numbers.
            </p>
            <p>
              We designed <strong>Lab Buddies</strong> to solve this exact bottleneck. It is a lightweight, zero-configuration study room workspace where anyone can launch a collaboration session under a 6-digit PIN. 
            </p>
            <p>
              By combining instant chat messaging and shared sticky notes with file sharing and code helpers, we created the ultimate lightweight study room for students. 
            </p>
          </div>
        </Card>

        {/* Core Values Section */}
        <div className="flex flex-col gap-6 items-center mt-6">
          <h2 className="font-archivo text-xl uppercase text-neo-dark">
            Our Core Values
          </h2>
          <div className="gsap-about-grid grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            {values.map((val, idx) => (
              <div key={idx} className="gsap-about-card flex h-full">
                <Card variant={val.color} className="p-6 border-[3px] shadow-neo-sm h-full flex flex-col gap-4">
                  <div className="w-12 h-12 bg-white border-[2.5px] border-neo-dark rounded-[10px] shadow-neo-sm flex items-center justify-center flex-shrink-0">
                    {val.icon}
                  </div>
                  <h3 className="font-archivo text-xs uppercase tracking-wider mt-2">
                    {val.title}
                  </h3>
                  <p className={`text-xs font-semibold leading-relaxed ${
                    val.color === 'purple' ? 'text-white/80' : 'text-neo-dark/70'
                  }`}>
                    {val.desc}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <Link href="/create">
            <Button variant="yellow" size="lg" className="border-[3px] shadow-[3px_3px_0_0_#111111] hover:shadow-[5px_5px_0_0_#111111]">
              Launch a Room
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
