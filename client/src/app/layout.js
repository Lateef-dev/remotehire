import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/store/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Toaster from '@/components/Toaster';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata = {
  title: { default: 'RemoteHire · Remote jobs for developers', template: '%s · RemoteHire' },
  description: 'Find remote developer jobs, or hire remote talent. Built with Next.js, Redux Toolkit, Node.js and MongoDB.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
