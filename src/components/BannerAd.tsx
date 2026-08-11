'use client';

import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '@/lib/socket';
import { useRoomStore } from '@/store/roomStore';

interface BannerAdProps {
  className?: string;
  dark?: boolean;
}

export default function BannerAd({ className = '', dark = false }: BannerAdProps) {
  const loggedInUser = useRoomStore((state) => state.loggedInUser);
  const isPremium = loggedInUser?.plan && loggedInUser.plan !== 'free';

  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const BACKEND_URL = getBackendUrl();


  const mockAds = [
    {
      title: "c'Balm",
      desc: "When it comes to your skin, never settle. We offer skin, hair and body care formulations created with meticulous attention to detail, and sensory pleasure in mind.",
      cta: "Learn More",
      image: "/ad_cbalm.jpg"
    },
    {
      title: "Lab Buddies Premium",
      desc: "Unlock dynamic +500 MB storage limits, host up to 50 active group voice members, and enjoy a clean platform experience with zero ads.",
      cta: "Upgrade Premium",
      image: "/ad_labbuddies.jpg"
    },
    {
      title: "Modi Studio",
      desc: "Design and build premium next-generation digital products, PWAs, and custom design systems optimized for conversions and beautiful micro-interactions.",
      cta: "View Portfolio",
      image: "/ad_modistudio.jpg"
    }
  ];

  const trackImpression = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/track-banner-impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Failed to log banner impression:', err);
    }
  };

  const trackClick = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/track-banner-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Failed to log banner click:', err);
    }
  };

  useEffect(() => {
    // Track initial load impression
    trackImpression();

    const bannerTimer = setInterval(() => {
      // Trigger refresh animation
      setIsRefreshing(true);
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);

      // Track impression on banner refresh
      trackImpression();
      
      // Rotate banner ad
      setCurrentAdIndex((prev) => (prev + 1) % mockAds.length);
    }, 60000); // 1 minute refresh

    return () => clearInterval(bannerTimer);
  }, []);

  const activeAd = mockAds[currentAdIndex];

  if (isPremium) return null;

  return (
    <div className={`w-full border flex flex-col xs:flex-row relative overflow-hidden select-none rounded-xl transition-all duration-500 ${
      dark 
        ? 'border-white/[0.08] bg-[#0f0f10] text-[#f4f4f5] shadow-[0_2px_12px_rgba(0,0,0,0.4)]' 
        : 'border-black/10 bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
    } ${className}`}>
      {/* AdChoices Badge in Top-Right */}
      <div className="absolute top-2 right-2.5 flex items-center gap-1 z-10">
        <svg className="w-3.5 h-3.5 text-blue-500 fill-current" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <svg className={`w-3.5 h-3.5 cursor-pointer ${dark ? 'text-white/30 hover:text-white/60' : 'text-black/30 hover:text-black/60'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>

      {/* Ad Image Row (top on mobile, left column on sm+) */}
      <div className={`w-full h-28 sm:w-1/4 sm:h-auto relative flex items-center justify-center border-b sm:border-b-0 sm:border-r overflow-hidden flex-shrink-0 ${
        dark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-100 border-black/5'
      }`}>
        <img 
          src={activeAd.image} 
          alt={activeAd.title} 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Ad Text & CTA Column (below image on mobile, right on sm+) */}
      <div className="flex-1 p-4 pr-12 flex flex-col justify-between gap-2 min-w-0">
        <div className="flex flex-col gap-1 text-left">
          <span className={`text-sm sm:text-base font-bold leading-tight tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
            {activeAd.title}
          </span>
          <p className={`text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-3 ${dark ? 'text-[#a1a1aa]' : 'text-gray-600'}`}>
            {activeAd.desc}
          </p>
        </div>
        <div className="flex justify-end mt-1">
          <button 
            type="button"
            onClick={() => {
              trackClick();
              alert(`Redirecting to ${activeAd.title} website...`);
            }}
            className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[11px] font-bold transition-all shadow-sm active:scale-95 border-0 cursor-pointer"
          >
            {activeAd.cta}
          </button>
        </div>
      </div>
      
      {/* Simulated Refresh Overlay (Brief transition spinner) */}
      {isRefreshing && (
        <div className={`absolute inset-0 backdrop-blur-[1px] flex items-center justify-center z-20 animate-in fade-in duration-200 ${
          dark ? 'bg-[#0f0f10]/95' : 'bg-white/95'
        }`}>
          <div className="w-8 h-8 rounded-full border-3 border-[#3B82F6] border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}
