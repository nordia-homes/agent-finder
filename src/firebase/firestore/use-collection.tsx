
'use client';
import { useState, useEffect } from 'react';
import type { Query, DocumentData, FirestoreError } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T extends DocumentData>(query: Query<DocumentData> | Query<T> | null) {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<FirestoreError | FirestorePermissionError | null>(null);

    useEffect(() => {
        if (query === null) {
            setData(null);
            setLoading(false);
            return;
        }
        setLoading(true);

        const unsubscribe = onSnapshot(query, (snapshot) => {
            const result: T[] = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as unknown as T));
            setData(result);
            setLoading(false);
            setError(null);
        }, 
        async (serverError) => {
            let path = "unknown_path";
            try {
                path = (query as any)._query.path.segments.join('/');
            } catch (e) {
                // Ignore errors trying to get path
            }

            const permissionError = new FirestorePermissionError({
                path: path,
                operation: 'list',
            });
            
            errorEmitter.emit('permission-error', permissionError);
            setError(permissionError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [query]);

    return { data, loading, error };
}
