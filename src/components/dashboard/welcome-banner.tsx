'use client';
import { useUser } from '@/firebase';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

export function WelcomeBanner() {
  const { user, loading } = useUser();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    const newGreeting =
      hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    setGreeting(newGreeting);
  }, []);
  
  const displayName = user?.displayName?.split(' ')[0] || 'there';

  if (loading || !greeting) {
     return (
        <Card className="overflow-hidden rounded-[32px] border border-[#d7deeb] bg-white/90 p-8 shadow-[0_24px_60px_rgba(31,47,79,0.08)]">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-8 shadow-[0_26px_70px_rgba(33,51,84,0.10)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(121,145,186,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(196,210,232,0.22),_transparent_30%)]" />
      <div className="absolute right-[-18px] top-[-24px] opacity-[0.14]">
        <Sparkles size={170} strokeWidth={0.75} className="text-[#62759d]" />
      </div>
      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_360px] lg:items-stretch">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
            <Sparkles className="h-3.5 w-3.5" />
            Executive overview
          </div>
          <div className="space-y-3">
            <CardTitle className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-5xl">
              {greeting}, {displayName}
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-8 text-slate-500">
              A sharper view of pipeline movement, outreach momentum, and execution priorities so the team can act with confidence and speed.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Pipeline command center</p>
            </div>
            <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mode</p>
              <p className="mt-1 text-sm font-medium text-slate-800">Lead acceleration</p>
            </div>
          </div>
        </div>
        <div className="rounded-[30px] border border-[#d9e0ec] bg-[linear-gradient(180deg,_rgba(242,246,252,0.96),_rgba(233,240,249,0.96))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_40px_rgba(33,51,84,0.08)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white p-2.5 shadow-[0_10px_18px_rgba(33,51,84,0.08)]">
              <TrendingUp className="h-5 w-5 text-[#5f7399]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Focus today</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">
                Push contacted leads toward demo and keep follow-up cadence tight across AI calls and WhatsApp.
              </p>
            </div>
          </div>
          <Link
            href="/leads"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#415782] px-4 py-2.5 text-sm font-medium text-white shadow-[0_14px_30px_rgba(47,66,104,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#384d75]"
          >
            Open lead workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
