"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// /client simply redirects to the main home page which is the client-facing view.
// This gives clients a dedicated shareable URL: yourdomain.com/client
export default function ClientPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/');
    }, [router]);
    return null;
}
