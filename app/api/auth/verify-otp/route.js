import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code } = await request.json()

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('mc_auth_otps')
      .select('*')
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', now)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    // Mark as used
    await supabase.from('mc_auth_otps').update({ used: true }).eq('id', data.id)

    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set('mc_session', sessionSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // 'strict' breaks Safari web app launches from Dock/Home Screen
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    })

    return response
  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
