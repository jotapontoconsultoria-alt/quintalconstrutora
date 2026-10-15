import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/montserrat'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quintal Construtora — Acompanhamento de obras',
  description: 'Kanban para acompanhar cada obra em execução na Quintal Construtora, da fase de projeto aos revestimentos.',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: '#173b2c',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  )
}
