import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter_Tight, Roboto_Mono } from 'next/font/google';
import './globals.css';

const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '800'],
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Studio DVC · analítica de Instagram',
  description: 'Tablero privado de @studio.dvc.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${interTight.variable} ${robotoMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
