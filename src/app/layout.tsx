import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWARegister } from '@/components/PWARegister';

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.toolshop226catalog.com'),
  title: 'TOOL SHOP 226 Plus | ศูนย์รวมเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์ครบวงจร',
  description:
    'แคตาล็อกเครื่องมือช่างแท้ 100% สเปกละเอียด แบรนด์ชั้นนำ SATA, ASAHI, PB Swiss Tools, Makita, Bosch, DeWalt, Milwaukee ราคาส่ง พร้อมส่งทั่วประเทศ ออกใบกำกับภาษีได้',
  keywords: [
    'เครื่องมือช่าง',
    'เครื่องมือช่างราคาส่ง',
    'อุปกรณ์ฮาร์ดแวร์',
    'SATA',
    'ASAHI',
    'PB Swiss Tools',
    'Makita',
    'Bosch',
    'DeWalt',
    'Milwaukee',
    'ใบเสนอราคาเครื่องมือช่าง',
    'ออกใบกำกับภาษี',
    'TOOL SHOP 226 Plus',
  ],
  alternates: {
    canonical: 'https://www.toolshop226catalog.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
    url: 'https://www.toolshop226catalog.com',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HardwareStore',
  name: 'TOOL SHOP 226 Plus',
  url: 'https://www.toolshop226catalog.com',
  logo: 'https://www.toolshop226catalog.com/logo.png',
  image: 'https://www.toolshop226catalog.com/logo.png',
  description:
    'ศูนย์รวมเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์ครบวงจร ราคาส่ง สเปกละเอียด แบรนด์แท้ 100% พร้อมส่งทั่วประเทศ ออกใบกำกับภาษีได้',
  priceRange: '฿฿',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'TH',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.toolshop226catalog.com/?search={search_term_string}',
    'query-input': 'required name=search_term_string',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen antialiased bg-zinc-950 text-zinc-100">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
