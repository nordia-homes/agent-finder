'use client';
import { useUser } from '@/firebase';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

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
        <Card className="p-6 relative overflow-hidden">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary to-primary/70 p-6 text-primary-foreground shadow-lg">
      <div className="absolute right-0 top-0 -z-0 opacity-20">
        <Sparkles size={128} strokeWidth={0.5} />
      </div>
      <div className="relative z-10">
        <CardTitle className="text-2xl font-bold font-headline text-white">
          {greeting}, {displayName}!
        </CardTitle>
        <CardDescription className="mt-2 text-white/80">
          Here's your summary for today. Let's make it a great one.
        </CardDescription>
      </div>
    </Card>
  );
}
