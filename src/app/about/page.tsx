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
      gsap.from('.gsap-title', {
        y: -30,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });

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
      icon: <Compass className="w-6 h-6" />,
      accent: "#FFD600"
    },
    {
      title: "Privacy by Design",
      desc: "We don't sell your data. Files shared are ephemeral. Rooms, logs, chats, and documents self-destruct from the servers as soon as your timer completes.",
      icon: <Target className="w-6 h-6" />,
      accent: "#22C55E"
    },
    {
      title: "Built for Students",
      desc: "Built for labs, study grids, hackathons, and lectures. Simple features tailored specifically to code compiling, PDF reviewing, and exam note mapping.",
      icon: <GraduationCap className="w-6 h-6" />,
      accent: "#8B5CF6"
    }
  ];

  return (
    <div ref={containerRef} className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex flex-col gap-12 text-center relative z-10">
        
        {/* Title */}
        <div className="gsap-title flex flex-col gap-3 items-center">
          <span className="bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/25 text-xs font-medium px-3.5 py-1.5 rounded-full">
            Our Mission
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#f4f4f5] max-w-3xl leading-tight">
            Designed to Connect Classmates
          </h1>
          <p className="text-sm text-[#71717a] max-w-xl">
            We believe study resources should be shared instantly, privately, and seamlessly. Learn what drives our product.
          </p>
        </div>

        {/* Story Section */}
        <div className="glass-card p-8 md:p-12 text-left flex flex-col gap-6 mt-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 select-none">
            <BookOpen className="w-5 h-5 text-[#FF6A00]" />
            <h2 className="text-sm font-semibold text-[#f4f4f5] uppercase tracking-wider">
              The Story behind &quot;Lab Buddies&quot;
            </h2>
          </div>
          <div className="flex flex-col gap-4 text-sm text-[#71717a] leading-relaxed">
            <p>
              During computer lab lectures and group study sessions, sharing code scripts, PDF slides, and terminal stack outputs was incredibly frustrating. Emailing files felt archaic, setting up GitHub repos for simple debugging code took too much time, and using common messaging boards leaked personal emails or phone numbers.
            </p>
            <p>
              We designed <strong className="text-[#f4f4f5] font-medium">Lab Buddies</strong> to solve this exact bottleneck. It is a lightweight, zero-configuration study room workspace where anyone can launch a collaboration session under a 6-digit PIN. 
            </p>
            <p>
              By combining instant chat messaging and shared sticky notes with file sharing and code helpers, we created the ultimate lightweight study room for students. 
            </p>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="flex flex-col gap-6 items-center mt-6">
          <h2 className="text-xl font-semibold text-[#f4f4f5]">
            Our Core Values
          </h2>
          <div className="gsap-about-grid grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
            {values.map((val, idx) => (
              <div key={idx} className="gsap-about-card flex h-full">
                <div className="glow-card p-6 h-full flex flex-col gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${val.accent}15`, border: `1px solid ${val.accent}25`, color: val.accent }}
                  >
                    {val.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-[#f4f4f5]">
                    {val.title}
                  </h3>
                  <p className="text-xs text-[#71717a] leading-relaxed">
                    {val.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <Link href="/create">
            <Button variant="yellow" size="lg" className="shadow-[0_0_20px_rgba(255,214,0,0.2)]">
              Launch a Room
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
