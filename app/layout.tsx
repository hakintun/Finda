import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'FINDA — Find it around you', description: 'Discover products and trusted local sellers in Port Harcourt.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
