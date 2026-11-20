// Prints a new pair of VAPID keys for web push (notifications on customers' phones and browsers).
// Put the lines in .env.local, or in the host's environment. Make a separate pair for production, and keep the private key secret.
const webpush = require('web-push');

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@yourdomain.com');
console.log('\nReplace the VAPID_SUBJECT with a real contact address for the push services (mailto: or https://).');
