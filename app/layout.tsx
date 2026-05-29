import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'tldraw/tldraw.css';
import AppWindowFrame from './_components/local/AppWindowFrame';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'OpenFMV',
  description: 'A local-first interactive movie editor',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppWindowFrame>{children}</AppWindowFrame>
      </body>
    </html>
  );
}
