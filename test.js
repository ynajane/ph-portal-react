// Send a test OTP using the same sendSms() your server uses.
// Run from the project folder (same folder as server.js and .env):
//   node test.js 9171234567        (PH number without the leading 0)
//   node test.js +639171234567     (full international number also works)
import 'dotenv/config';
import crypto from 'node:crypto';
import { sendSms, mode } from './services.js';

const arg = process.argv[2];
if (!arg) {
  console.log('Usage: node test.js 9171234567');
  process.exit(1);
}

// Normalise: "09171234567", "639171234567", "9171234567" or "+639171234567" -> "+639171234567"
const digits = arg.replace(/[^\d+]/g, '');
const phone = digits.startsWith('+') ? digits : '+63' + digits.replace(/^0|^63/, '');
if (!/^\+\d{8,15}$/.test(phone)) {
  console.error('That does not look like a valid phone number:', arg);
  process.exit(1);
}

const otp = String(crypto.randomInt(100000, 1000000));
console.log('SMS provider :', mode().sms);
console.log('Sending to   :', phone);
console.log('OTP code     :', otp, '(only shown here so you can compare it with the text)');

try {
  await sendSms(phone, otp);
  console.log(mode().sms.startsWith('CONSOLE')
    ? '\nConsole mode: nothing was really sent. Add TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID to .env to send a real SMS.'
    : '\nAccepted by the provider. The text should arrive within a minute.');
} catch (e) {
  console.error('\nFAILED:', e.message);
  if (/401/.test(e.message)) console.error('Hint: the API key is wrong.');
  if (/404/.test(e.message)) console.error('Hint: the Device ID is wrong.');
  if (e.name === 'TimeoutError' || /fetch failed/i.test(e.message)) console.error('Hint: cannot reach the provider. Check internet / DNS.');
  process.exit(1);
}