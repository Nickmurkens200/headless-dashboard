'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setStoredTokens } from '@/lib/api';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      setStoredTokens({
        accessToken,
        refreshToken,
        expiresIn: 900,
      });
      router.push('/');
    } else {
      router.push('/auth/error?error=missing_tokens');
    }
  }, [searchParams, router]);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Completing sign in...</p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
