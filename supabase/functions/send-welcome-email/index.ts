// Supabase Edge Function: send-welcome-email
// Sends welcome emails to new employees via Gmail SMTP
// Deploy: supabase functions deploy send-welcome-email --no-verify-jwt
// Set secrets: supabase secrets set GMAIL_USER=zeelp1696@gmail.com GMAIL_APP_PASSWORD="jncp rehl dmbz sfcv"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, to_name, temp_password } = await req.json()

    if (!to_email || !to_name || !temp_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const GMAIL_USER = Deno.env.get('GMAIL_USER') ?? ''
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') ?? ''

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD secrets.')
    }

    // Use nodemailer via npm: specifier (Deno supports this natively)
    const nodemailer = (await import("npm:nodemailer@6.9.8")).default

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 20px auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 8px 0 0; opacity: 0.85; }
          .content { background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
          .credentials { background: #f9fafb; padding: 20px; border-left: 4px solid #667eea; border-radius: 0 8px 8px 0; margin: 20px 0; }
          .password { font-size: 22px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }
          .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SmartHRMS!</h1>
            <p>Your journey starts here</p>
          </div>
          <div class="content">
            <p>Hi <strong>${to_name}</strong>,</p>
            <p>Welcome to the team! Your account has been created in our HR Management System.</p>
            
            <div class="credentials">
              <p style="margin: 4px 0;"><strong>Email:</strong> ${to_email}</p>
              <p style="margin: 4px 0;"><strong>Temporary Password:</strong></p>
              <div class="password">${temp_password}</div>
            </div>
            
            <p>🔒 <strong>Important Security Steps:</strong></p>
            <ol>
              <li>Login using your email and the temporary password above</li>
              <li>Navigate to <strong>Account Settings</strong></li>
              <li>Change your password immediately</li>
            </ol>
            
            <p>If you have any questions, please contact your HR department.</p>
            
            <div class="footer">
              <p>This is an automated message from SmartHRMS</p>
              <p>AI-Powered Human Resource Management System</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"SmartHRMS" <${GMAIL_USER}>`,
      to: to_email,
      subject: '🎉 Welcome to SmartHRMS — Your Login Credentials',
      html: htmlContent,
      text: `Welcome ${to_name}! Your temporary password is: ${temp_password}. Please change it after first login.`,
    })

    console.log(`✅ Welcome email sent to ${to_email}`)

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${to_email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
