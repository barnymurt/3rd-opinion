import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Second Opinion - Balance AI\'s tendency to agree',
  description: 'Get balanced perspectives on AI chat outputs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
