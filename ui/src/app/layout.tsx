import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Self-hosted server dashboard',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="ambient">
            <div className="ambient-orb"></div>
            <div className="ambient-orb"></div>
          </div>
          <div className="grid-pattern"></div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
