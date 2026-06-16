import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import { ToastProvider } from '@/components/toast'
import { OfflineBanner } from '@/components/offline-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stacks Crowdfunding DApp',
  description: 'Decentralized crowdfunding platform built on Stacks blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <ErrorBoundary>
            <ToastProvider>
              <OfflineBanner />
              {children}
            </ToastProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  )
}