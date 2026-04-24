import type {Metadata} from 'next';
import './globals.css'; // Global styles

import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'Power VPN',
  description: 'Enterprise fleet management system for OpenVPN, WireGuard, Cisco AnyConnect, and L2TP/IPsec.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
