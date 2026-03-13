import './globals.css'

export const metadata = {
  title: 'Mission Control',
  description: 'Denver Miller — World of Grooves studio dashboard',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
