import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import { CompanyProvider } from '@/lib/company-context' // <--- AÑADIDO
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: 'RAG Intelligence',
  description: 'Semantic search and AI chat for your e-commerce store.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        <AuthProvider>
          {/* AÑADIDO EL COMPANY PROVIDER AQUÍ */}
          <CompanyProvider>
            {children}
          </CompanyProvider>
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}