// Test file to debug Mailtrap email sending
import { sendWelcomeEmail } from './emailService';

// Test the email service
async function testEmail() {
  console.log('🧪 Testing Mailtrap email service...');
  
  // Check if token is loaded
  const token = import.meta.env.VITE_MAILTRAP_TOKEN;
  console.log('Token present:', !!token);
  console.log('Token (first 10 chars):', token?.substring(0, 10));
  
  // Try sending a test email
  try {
    const result = await sendWelcomeEmail(
      'test@example.com',
      'Test Employee',
      'TestPassword123!'
    );
    console.log('✅ Email sent successfully:', result);
  } catch (error) {
    console.error('❌ Email send failed:', error);
  }
}

// Export for manual testing in browser console
(window as any).testMailtrap = testEmail;

console.log('📧 Mailtrap test loaded. Run: window.testMailtrap()');
