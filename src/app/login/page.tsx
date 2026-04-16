'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path
      fill="currentColor"
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.86 2.25-5.08 2.25-4.49 0-8.16-3.66-8.16-8.16s3.67-8.16 8.16-8.16c2.53 0 4.21.99 5.16 1.89l2.76-2.76C19.01 1.49 16.25 0 12.48 0 5.6 0 0 5.6 0 12.5S5.6 25 12.48 25c7.2 0 12.04-4.82 12.04-12.24 0-.76-.07-1.52-.2-2.28H12.48z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    if (!userLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, userLoading, router]);
  
  const handleAuthError = (error: any) => {
    console.error("Firebase Auth Error:", error);
    let title = "Authentication Failed";
    let description = "An unexpected error occurred. Please try again.";
    let duration = 5000;

    switch (error.code) {
      case 'auth/user-not-found':
        title = 'User Not Found';
        description = 'No account found with this email. Please sign up.';
        break;
      case 'auth/wrong-password':
        title = 'Incorrect Password';
        description = 'The password you entered is incorrect.';
        break;
      case 'auth/email-already-in-use':
        title = 'Email In Use';
        description = 'An account already exists with this email. Please sign in.';
        break;
      case 'auth/weak-password':
        title = 'Weak Password';
        description = 'Your password must be at least 6 characters long.';
        break;
      case 'auth/invalid-email':
        title = 'Invalid Email';
        description = 'Please enter a valid email address.';
        break;
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        // These are not errors, so we just return without showing a toast.
        return;
      case 'auth/unauthorized-domain':
        title = 'Domain Not Authorized';
        description = 'This domain is not authorized for sign-in. Please add it to the authorized domains in your Firebase console.';
        duration = 10000;
        break;
    }
    
    toast({ variant: 'destructive', title, description, duration });
  };
  
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      toast({ title: 'Authentication service is not available.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Sign-up successful!', description: 'Redirecting to your dashboard...' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Sign-in successful!', description: 'Redirecting to your dashboard...' });
      }
      // On success, the useEffect will redirect to dashboard
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      toast({ title: 'Authentication service is not available.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Sign-in successful!', description: 'Redirecting to your dashboard...' });
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
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
          <CardTitle>{mode === 'signin' ? 'Welcome Back' : 'Create an Account'}</CardTitle>
          <CardDescription>Enter your credentials to access the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuthAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Sign in with Google
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="underline hover:text-primary disabled:cursor-not-allowed"
              disabled={loading}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
