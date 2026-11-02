import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TOOL SHOP 226 Plus | Hardware Tools Catalog',
  description: 'แคตาล็อกเครื่องมือช่าง ฮาร์ดแวร์ TOOL SHOP 226 Plus',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
      </head>
      <body className="min-h-screen antialiased bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
