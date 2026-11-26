import type { Metadata, Viewport } from 'next';
import './globals.css';
import GlobalLoading from './global-loading';

export const metadata: Metadata = { title: 'FINDA — Find it around you', description: 'Discover products and trusted local sellers in Port Harcourt.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><GlobalLoading />{children}</body></html>;
}
