import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/shared/components/layout/theme-provider';
import { ToastProvider } from '@/shared/components/feedback/toast';
import { PwaProvider } from '@/features/pwa/components/pwa-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'CFA Buddy — Your CFA Operating System',
  description: 'Personal CFA preparation platform with content library, question bank, and analytics.',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CFA Buddy',
  },
};

export const viewport: Viewport = {
  themeColor: '#002B5C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <PwaProvider>
              {children}
            </PwaProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
