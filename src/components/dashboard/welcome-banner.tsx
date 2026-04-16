'use client';
import { users } from '@/lib/data';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';

export function WelcomeBanner() {
  const currentUser = users[0];
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    const newGreeting =
      hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
    setGreeting(newGreeting);
  }, []);

  if (!greeting) {
    return null; // or a skeleton loader
  }


  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 shadow-lg">
      <div className="absolute right-0 top-0 -z-10 text-primary/10">
        <Sparkles size={128} strokeWidth={0.5} />
      </div>
      <div>
        <CardTitle className="text-2xl font-bold text-primary-foreground font-headline">
          {greeting}, {currentUser.name.split(' ')[0]}!
        </CardTitle>
        <CardDescription className="mt-2 text-primary-foreground/80">
          Here's your summary for today. Let's make it a great one.
        </CardDescription>
      </div>
    </Card>
  );
}
