// Supabase Edge Function to send welcome emails
// Deploy this to Supabase to bypass CORS restrictions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const MAILTRAP_TOKEN = Deno.env.get('MAILTRAP_TOKEN')
const FROM_EMAIL = 'hr@smarthrms.com'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    const { employeeEmail, employeeName, tempPassword } = await req.json()

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
          .password { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SmartHRMS!</h1>
            <p>Your journey starts here</p>
          </div>
          <div class="content">
            <p>Hi <strong>${employeeName}</strong>,</p>
            
            <p>Welcome to the team! Your account has been created in our HR Management System.</p>
            
            <div class="credentials">
              <p><strong>Email:</strong> ${employeeEmail}</p>
              <p><strong>Temporary Password:</strong></p>
              <div class="password">${tempPassword}</div>
            </div>
            
            <p>🔒 <strong>Important Security Steps:</strong></p>
            <ol>
              <li>Login using your email and the temporary password above</li>
              <li>Navigate to <strong>Settings → Security</strong></li>
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

    // Send email via Mailtrap API
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILTRAP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: 'SmartHRMS' },
        to: [{ email: employeeEmail }],
        subject: '🎉 Welcome to SmartHRMS!',
        html: htmlContent,
        text: `Welcome ${employeeName}! Your temp password is: ${tempPassword}`,
        category: 'Employee Onboarding',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Mailtrap API error: ${errorText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
