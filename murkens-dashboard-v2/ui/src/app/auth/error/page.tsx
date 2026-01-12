'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    sso_failed: 'SSO authentication failed. Please try again.',
    missing_tokens: 'Authentication tokens were not received.',
    session_expired: 'Your session has expired. Please sign in again.',
    default: 'An authentication error occurred.',
  };

  return (
    <p>{errorMessages[error || ''] || errorMessages.default}</p>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="container">
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <div className={styles.icon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1>Authentication Error</h1>
          <Suspense fallback={<p>Loading...</p>}>
            <ErrorContent />
          </Suspense>
          <Link href="/login" className={styles.backBtn}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
