import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://toolshop226catalog.com'),
  title: 'TOOL SHOP 226 Plus | ศูนย์รวมเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์ครบวงจร',
  description:
    'แคตาล็อกเครื่องมือช่างแท้ 100% สเปกละเอียด แบรนด์ชั้นนำ SATA, ASAHI, PB Swiss Tools, Makita, Bosch, DeWalt, Milwaukee ราคาส่ง พร้อมส่งทั่วประเทศ ออกใบกำกับภาษีได้',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TOOL SHOP 226',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://toolshop226catalog.com',
    siteName: 'TOOL SHOP 226 Plus',
    title: 'TOOL SHOP 226 Plus | ศูนย์รวมเครื่องมือช่างแท้ 100% ราคาส่ง',
    description:
      'ค้นหาแคตาล็อกเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์กว่าแสนรายการ สเปกละเอียด ขอใบเสนอราคาและสั่งซื้อผ่าน LINE ได้ทันที',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: 'TOOL SHOP 226 Plus Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'TOOL SHOP 226 Plus | ศูนย์รวมเครื่องมือช่างแท้ 100%',
    description: 'แคตาล็อกเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์ครบวงจร ราคาส่ง ออกใบกำกับภาษีได้',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen antialiased bg-zinc-950 text-zinc-100">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
