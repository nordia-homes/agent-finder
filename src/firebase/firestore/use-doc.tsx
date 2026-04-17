
'use client';
import { useState, useEffect } from 'react';
import type { DocumentReference, DocumentData, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T extends DocumentData>(ref: DocumentReference<DocumentData> | DocumentReference<T> | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | FirestorePermissionError | null>(null);

    useEffect(() => {
        if (!ref) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);

        const unsubscribe = onSnapshot(ref, (doc) => {
            if (doc.exists()) {
                setData({ ...doc.data(), id: doc.id } as unknown as T);
            } else {
                setData(null);
            }
            setLoading(false);
            setError(null);
        },
        async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: ref.path,
                operation: 'get',
            });

            errorEmitter.emit('permission-error', permissionError);
            setError(permissionError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [ref]);

    return { data, loading, error };
}
