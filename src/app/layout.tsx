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
    'แหล่งรวมเครื่องมือช่างคุณภาพ ราคาขายส่ง บริการจัดส่งทั่วประเทศ ไม่มีขั้นต่ำ อาทิเช่น KEIBA , KNIPEX , SATA , ASAHI , VESSEL , CONSO , KINGTONY , PB SWISS TOOLS',
  keywords: [
    'toolshop226',
    'toolshop226catalog',
    'TOOL SHOP 226 Plus',
    'เครื่องมือช่าง',
    'ราคาขายส่ง',
    'เครื่องมือช่างราคาส่ง',
    'อุปกรณ์ฮาร์ดแวร์',
    'KEIBA',
    'KNIPEX',
    'SATA',
    'ASAHI',
    'VESSEL',
    'CONSO',
    'KINGTONY',
    'PB Swiss Tools',
    'PB SWISS TOOLS',
    'Makita',
    'Bosch',
    'DeWalt',
    'Milwaukee',
    'ใบเสนอราคาเครื่องมือช่าง',
    'ออกใบกำกับภาษี',
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '480x480' },
      { url: '/logo.png', type: 'image/png', sizes: '480x480' },
    ],
    apple: [
      { url: '/icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: 'https://www.toolshop226catalog.com',
    siteName: 'TOOL SHOP 226 Plus',
    title: 'TOOL SHOP 226 Plus | ศูนย์รวมเครื่องมือช่างแท้ 100% ราคาส่ง',
    description:
      'แหล่งรวมเครื่องมือช่างคุณภาพ ราคาขายส่ง บริการจัดส่งทั่วประเทศ ไม่มีขั้นต่ำ อาทิเช่น KEIBA , KNIPEX , SATA , ASAHI , VESSEL , CONSO , KINGTONY , PB SWISS TOOLS',
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
    description:
      'แหล่งรวมเครื่องมือช่างคุณภาพ ราคาขายส่ง บริการจัดส่งทั่วประเทศ ไม่มีขั้นต่ำ อาทิเช่น KEIBA , KNIPEX , SATA , ASAHI , VESSEL , CONSO , KINGTONY , PB SWISS TOOLS',
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
    'แหล่งรวมเครื่องมือช่างคุณภาพ ราคาขายส่ง บริการจัดส่งทั่วประเทศ ไม่มีขั้นต่ำ อาทิเช่น KEIBA , KNIPEX , SATA , ASAHI , VESSEL , CONSO , KINGTONY , PB SWISS TOOLS',
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
