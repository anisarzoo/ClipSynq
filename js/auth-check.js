import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Check if user is logged in via QR
const linkedUserId = localStorage.getItem('linkedUserId');
const loginMethod = localStorage.getItem('loginMethod');

if (linkedUserId && loginMethod === 'qr') {
    // User is logged in via QR - allow access
    console.log('✓ QR login active for user:', linkedUserId);
    // App will use linkedUserId to access data
} else {
    // Check Firebase auth for regular login
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });
}
