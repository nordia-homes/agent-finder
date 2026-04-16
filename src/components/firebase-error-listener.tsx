
'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
    const { toast } = useToast();

    useEffect(() => {
        const handleError = (error: FirestorePermissionError) => {
            console.error(error); // Log the full error to the console for devs
            toast({
              variant: "destructive",
              title: "Permissions Error",
              description: "You don't have permission to perform this action.",
            })
            // In a real app, you might want to throw the error in development
            // to see the Next.js error overlay.
            if (process.env.NODE_ENV === 'development') {
               // throw error;
            }
        };

        errorEmitter.on('permission-error', handleError);

        return () => {
            errorEmitter.off('permission-error', handleError);
        };
    }, [toast]);

    return null;
}
