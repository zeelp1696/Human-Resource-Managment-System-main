// Email service using EmailJS (works from browser - no CORS!)
import emailjs from '@emailjs/browser';

export async function sendWelcomeEmail(
  employeeEmail: string,
  employeeName: string,
  tempPassword: string
): Promise<boolean> {
  // EmailJS credentials - get from emailjs.com (free account)
  const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  console.log('📧 EmailJS Configuration Check:');
  console.log('Service ID:', SERVICE_ID ? '✅ Set' : '❌ Missing');
  console.log('Template ID:', TEMPLATE_ID ? '✅ Set' : '❌ Missing');
  console.log('Public Key:', PUBLIC_KEY ? '✅ Set' : '❌ Missing');

  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.error('❌ EmailJS credentials missing! Check .env file');
    return false;
  }

  try {
    console.log('📤 Sending email to:', employeeEmail);
    
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        // EmailJS uses these standard field names
        to_name: employeeName,
        to_email: employeeEmail,
        reply_to: employeeEmail, // This ensures recipient gets the email
        temp_password: tempPassword,
        from_name: 'SmartHRMS',
        message: `Your temporary password is: ${tempPassword}`, // Fallback message
      },
      PUBLIC_KEY
    );

    console.log('✅ Email sent successfully via EmailJS!', result);
    return true;
  } catch (error: any) {
    console.error('❌ EmailJS error:', error);
    console.error('Error details:', error.text || error.message);
    return false;
  }
}
