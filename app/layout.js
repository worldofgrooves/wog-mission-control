import './globals.css'

export const metadata = {
  title: 'Mission Control — Janet AI',
  description: 'World of Grooves operations dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
