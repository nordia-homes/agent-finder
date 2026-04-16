'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.08 2.25-4.49 0-8.16-3.66-8.16-8.16s3.67-8.16 8.16-8.16c2.53 0 4.21.99 5.16 1.89l2.76-2.76C19.01 1.49 16.25 0 12.48 0 5.6 0 0 5.6 0 12.5S5.6 25 12.48 25c7.2 0 12.04-4.82 12.04-12.24 0-.76-.07-1.52-.2-2.28H12.48z"/></svg>
)

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const [isSigningIn, setIsSigningIn] = useState(false);
  
  useEffect(() => {
    if (!userLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, userLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth) {
        toast({ title: "Authentication service is not available.", variant: "destructive"});
        return;
    }
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Sign-in successful!", description: "Redirecting to your dashboard..." });
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, do not show an error
        console.log("Sign-in popup closed by user.");
      } else if (error.code === 'auth/unauthorized-domain') {
        toast({
          variant: "destructive",
          title: "Domain Not Authorized",
          description: "This domain is not authorized for Google Sign-In. Add it in your Firebase project: Authentication > Sign-in method > Authorized domains.",
          duration: 10000,
        });
      } else {
        console.error(error);
        toast({ title: "Sign-in failed", description: "Could not sign in with Google. Please try again.", variant: "destructive" });
      }
    } finally {
        setIsSigningIn(false);
    }
  };
  
  if (userLoading || user) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 font-bold font-headline text-primary text-2xl mb-2">
                <Building className="h-7 w-7" />
                <span>Agent Finder Pro</span>
            </div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in to access the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoogleSignIn} className="w-full" disabled={isSigningIn}>
            {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <GoogleIcon />}
            {isSigningIn ? "Please wait..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
