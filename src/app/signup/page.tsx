'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, User, Mail, Lock, Globe, MapPin, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';
import { useRoomStore } from '@/store/roomStore';
import Image from 'next/image';

interface CustomSelectProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  disabled?: boolean;
}

function CustomSelect({ label, icon, value, options, onChange, disabled }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 text-left relative w-full select-none">
      <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="neo-input w-full text-sm flex items-center justify-between text-left pl-9 pr-6"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          disabled={disabled}
        >
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </span>
          <span className="truncate">{value || 'Select option...'}</span>
          <span className="text-[8px] text-white/40 select-none">▼</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f0f10] border border-white/[0.1] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 max-h-48 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  value === opt ? 'bg-[#FFD600]/15 text-[#FFD600]' : 'text-[#f4f4f5] hover:bg-white/[0.06]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const addToast = useRoomStore((state) => state.addToast);

  const countryData: Record<string, string[]> = {
    'India': [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 
      'Delhi', 'Jammu & Kashmir', 'Puducherry', 'Chandigarh'
    ],
    'United States': [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 
      'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 
      'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 
      'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
      'Wisconsin', 'Wyoming'
    ],
    'United Kingdom': [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ],
    'Canada': [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
      'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
      'Prince Edward Island', 'Quebec', 'Saskatchewan', 
      'Northwest Territories', 'Nunavut', 'Yukon'
    ],
    'Australia': [
      'New South Wales', 'Victoria', 'Queensland', 'Western Australia', 
      'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'
    ],
    'Germany': [
      'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 
      'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Western Pomerania', 
      'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 
      'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'
    ],
    'Singapore': [
      'Central Region', 'East Region', 'North Region', 'Northeast Region', 'West Region'
    ]
  };

  const countries = Object.keys(countryData);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    country: 'India',
    state: 'Karnataka'
  });
  const [loading, setLoading] = useState(false);

  const handleCountryChange = (val: string) => {
    const states = countryData[val] || [];
    setForm({
      ...form,
      country: val,
      state: states[0] || ''
    });
  };

  const handleStateChange = (val: string) => {
    setForm({
      ...form,
      state: val
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.country || !form.state) {
      addToast('Please fill out all fields.', 'warning');
      return;
    }

    if (form.name.trim().length < 2) {
      addToast('Name must be at least 2 characters long.', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      addToast('Invalid email format.', 'warning');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(form.password)) {
      addToast('Password does not meet the strength requirements.', 'error');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : `http://${window.location.hostname}:5000`);
      const res = await fetch(`${backendUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'Account registered! Please log in.', 'success');
        router.push('/login');
      } else {
        addToast(data.error || 'Registration failed.', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('Server connection failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050608] text-[#f4f4f5]">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#050608]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center h-full relative z-10">
            <Image src="/logo.png?v=5" alt="Lab Buddies Logo" width={150} height={48} className="h-12 sm:h-14 w-auto object-contain my-auto" />
          </Link>
          <Link href="/login">
            <Button variant="white" size="sm">
              Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full p-8 border border-white/[0.08] bg-[#0f0f10] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] flex flex-col gap-6">
          
          <div className="text-center flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold text-[#f4f4f5]">Create Account</h1>
            <p className="text-xs text-[#71717a]">
              Start setting up rooms and tracking your verified profiles.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Name */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">Your Name</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="neo-input has-icon-left w-full text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">Email Address</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  placeholder="name@college.edu"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="neo-input has-icon-left w-full text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-medium uppercase text-[#a1a1aa] tracking-wider">Password</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 flex items-center pointer-events-none text-white/40 z-10">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="neo-input has-icon-left w-full text-sm"
                  disabled={loading}
                />
              </div>

              {/* Real-time Password Checker */}
              {form.password.length > 0 && (
                <div className="flex flex-col gap-1.5 border border-white/[0.06] bg-white/[0.02] p-3 rounded-xl mt-1 text-[11px] text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <span className={form.password.length >= 8 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {form.password.length >= 8 ? '✓' : '✗'}
                    </span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={( /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) ) ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {( /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) ) ? '✓' : '✗'}
                    </span>
                    <span>Uppercase &amp; Lowercase letters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={/\d/.test(form.password) ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {/\d/.test(form.password) ? '✓' : '✗'}
                    </span>
                    <span>At least one number</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={/[@$!%*?&]/.test(form.password) ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {/[@$!%*?&]/.test(form.password) ? '✓' : '✗'}
                    </span>
                    <span>Special character (@$!%*?&)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Country & State custom select row */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Country */}
              <CustomSelect
                label="Country"
                icon={<Globe className="h-4 w-4 text-white/30" />}
                value={form.country}
                options={countries}
                onChange={handleCountryChange}
                disabled={loading}
              />

              {/* State */}
              <CustomSelect
                label="State"
                icon={<MapPin className="h-4 w-4 text-white/30" />}
                value={form.state}
                options={countryData[form.country] || []}
                onChange={handleStateChange}
                disabled={loading}
              />

            </div>

            <Button type="submit" variant="yellow" size="lg" className="w-full gap-2 mt-2 shadow-[0_0_20px_rgba(255,214,0,0.2)]" disabled={loading}>
              <span>{loading ? 'Creating...' : 'Register'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

          </form>

          <div className="text-center text-xs text-[#71717a] mt-2">
            <span>Already have an account? </span>
            <Link href="/login" className="text-[#FF6A00] hover:underline">
              Log in here
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
