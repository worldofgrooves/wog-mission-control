import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // If LOGIN_EMAIL is set, only allow that address -- show error so mismatches are visible
    const allowedEmail = process.env.LOGIN_EMAIL
    if (allowedEmail && email.toLowerCase() !== allowedEmail.toLowerCase()) {
      console.log(`request-otp: email mismatch. received="${email}" allowed="${allowedEmail}"`)
      return NextResponse.json(
        { error: `Email not recognized. Expected: ${allowedEmail}` },
        { status: 403 }
      )
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Clear all existing OTPs, insert new one
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.from('mc_auth_otps').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: insertError } = await supabase.from('mc_auth_otps').insert({ code, expires_at })

    if (insertError) {
      console.error('OTP insert error:', insertError)
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 })
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    const fromAddress = process.env.RESEND_FROM || 'Mission Control <noreply@worldofgrooves.com>'

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: `${code} -- Mission Control access code`,
      html: `
        <div style="font-family: monospace; background: #000; color: #f0f0f0; padding: 32px; max-width: 400px;">
          <div style="color: #c9a96e; font-size: 11px; letter-spacing: 4px; margin-bottom: 24px;">WORLD OF GROOVES / MISSION CONTROL</div>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #fff; margin-bottom: 16px;">${code}</div>
          <div style="color: #888; font-size: 13px;">This code expires in 10 minutes.</div>
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend error:', JSON.stringify(emailError))
      return NextResponse.json(
        { error: `Email send failed: ${emailError.message || JSON.stringify(emailError)}` },
        { status: 500 }
      )
    }

    console.log('OTP sent successfully, email id:', emailData?.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('request-otp error:', err)
    return NextResponse.json({ error: String(err.message || err) }, { status: 500 })
  }
}
