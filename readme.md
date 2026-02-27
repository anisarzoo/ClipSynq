# ClipSynq 💬

![ClipSynq Logo](app.png)

**Sync messages instantly across all your devices**

ClipSynq is a modern progressive web application (PWA) that allows you to send and manage messages seamlessly across multiple devices. Real-time synchronization, folder organization, QR code login, and cross-device session management make ClipSynq the perfect solution for staying connected.

## ✨ Features

### 📱 Core Messaging
- **Real-time Message Sync** - Messages appear instantly on all connected devices
- **Edit & Delete** - Modify or remove messages anytime with visual indicators
- **Smart Copy** - Quick clipboard access for message content
- **Message Threading** - See conversation history with timestamps

### 📁 Organization & Management
- **Folders** - Create custom folders to organize messages by category (Work, Personal, Ideas, Archive, etc.)
- **Pinned Messages** - Pin important messages to a floating bar for quick access
- **Starred Messages** - Mark messages as favorites with highlight effect
- **Full-Text Search** - Search across all messages or within specific folders

### 🔐 Multi-Device Support
- **Device Tracking** - See which device sent each message with custom names
- **Device Renaming** - Rename devices anytime for easy identification
- **QR Code Login** - Quickly login on new devices by scanning a QR code
- **Device Management** - View all connected devices and manage sessions
- **Cross-Device Logout** - Logout from one device or all devices simultaneously
- **Online Status** - Real-time online/offline status for all devices

### 📲 Progressive Web App (PWA)
- **Offline Support** - Access your messages even without internet
- **Install to Home Screen** - Add ClipSynq to your device home screen (iOS, Android, Desktop)
- **Background Sync** - Messages sync automatically when connection returns
- **Fast Loading** - Lightning-fast performance with optimized service workers
- **App Store Links** - Direct links to iOS App Store and Google Play Store

### 🎨 User Experience
- **Responsive Design** - Perfect on desktop (>1024px), tablet (768-1024px), mobile (<768px), and small screens (<480px)
- **Professional UI** - Modern blue theme (#3b82f6) with intuitive navigation
- **Smooth Animations** - Polished transitions and interactions
- **Mobile Optimization** - Fixed input container, visible scrollbars, touch-friendly buttons
- **Accessibility** - ARIA labels, keyboard navigation, semantic HTML

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Realtime Database and Authentication enabled
- Google OAuth configured for seamless login

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd ClipSynq
   ```

2. **Configure Firebase**
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication (Google & Email/Password)
   - Create Realtime Database
   - Copy your Firebase config
   - Update `js/firebase-config.js`:
   ```javascript
   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
   import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
   import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID",
     databaseURL: "YOUR_DATABASE_URL"
   };
   ```

3. **Open in browser**
   - Local: `file:///path/to/ClipSynq/index.html`
   - Or deploy to web server

## 📂 Project Structure

```
ClipSynq/
├── index.html              # Main app interface
├── login.html              # Authentication page
├── manifest.json           # PWA manifest configuration
├── sw.js                   # Service worker for offline support
├── favicon.ico             # Browser tab icon
├── app.png                 # App logo/icon
│
├── js/
│   ├── app.js              # Core app initialization and UI
│   ├── auth.js             # Authentication flows (Google, Email, QR)
│   ├── messages.js         # Message management and real-time sync
│   ├── folders.js          # Folder creation and management
│   ├── devices.js          # Device tracking and management
│   ├── search.js           # Full-text search functionality
│   ├── qr.js               # QR code generation and scanning
│   └── firebase-config.js  # Firebase configuration
│
└── styles/
    ├── base.css            # CSS variables and root styles
    ├── app.css             # Main app styling
    ├── login.css           # Login page styling
    ├── components.css      # Reusable component styles
    └── mobile.css          # Responsive mobile styles
```

## 🔑 Key Technologies

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **Backend**: Firebase (Auth + Realtime Database)
- **PWA**: Service Worker, Web App Manifest
- **UI Libraries**: Font Awesome 6.4.0, html5-qrcode 2.3.8
- **Responsive**: Mobile-first design with 4 breakpoints

## 🔒 Security

- Google OAuth 2.0 authentication
- Email/Password secure login
- QR code-based device verification
- Firebase Realtime Database rules for user privacy
- No sensitive data stored in localStorage (except deviceId)

## 📊 Database Structure

```
users/
├── {userId}/
│   ├── messages/
│   │   ├── {messageId}: {content, timestamp, deviceId, pinned, starred...}
│   │
│   ├── folders/
│   │   ├── {folderId}: {name, color, messageCount...}
│   │
│   └── devices/
│       └── {deviceId}: {name, type, online, lastActive...}
│
qr-sessions/
└── {sessionId}: {userId, deviceId, status, createdAt...}
```

## 🎯 Usage

### Login
1. Open `login.html`
2. Choose: Google Sign-In, Email/Password, or QR Code
3. For new users, name your device
4. Get redirected to main app

### Sending Messages
1. Type in the message input at the bottom
2. Press Ctrl+Enter (or Cmd+Enter on Mac) to send
3. Use Shift+Enter for new line
4. Or click the send button

### Managing Messages
- **Star**: Click star icon to favorite
- **Pin**: Click pin icon to keep at top
- **Edit**: Click edit button and update
- **Copy**: Click copy to clipboard
- **Delete**: Click delete button

### Device Management
1. Go to "My Devices" section in sidebar
2. View all connected devices with status
3. **Rename** current device
4. **Logout** other devices
5. Logout from current device in menu

### Creating Folders
1. Click "New Folder" button
2. Enter folder name
3. Messages can be organized by folder
4. Switch between folders in sidebar

## 🐛 Bug Fixes (Latest)

### Authentication & Session Management
- ✅ Cross-device logout now properly synchronizes
- ✅ Auth state validation prevents post-logout messaging
- ✅ Google OAuth popup blocking error handling
- ✅ Dynamic device ID prevents nullability issues

### UI/UX Improvements
- ✅ Message input always visible on Android
- ✅ Fixed action button border glitches on interactions
- ✅ Enhanced mobile scrollbar styling
- ✅ Professional z-index management

### Device Management
- ✅ Device name change feature added
- ✅ Better device status indicators
- ✅ Improved device list UI with actions

### QR Code Login
- ✅ Improved error messages and feedback
- ✅ Better scanning UX
- ✅ Enhanced approval dialogs

## 📱 Mobile Optimization

- Fixed input container at bottom (no scroll interference)
- Responsive grid layouts for all screen sizes
- Touch-friendly buttons (minimum 36x36px)
- Optimized font sizes to prevent iOS zoom
- Enhanced scrollbar styling
- Proper z-index management for overlays

## 🌐 Browser Support

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile, Samsung Internet)

## 📦 Installation as PWA

### Desktop
- Open ClipSynq in Chrome/Edge
- Click "Install" button in address bar
- Choose "Install app"

### Mobile
- Open ClipSynq in browser
- Tap menu (⋮) → "Install app" or "Add to Home Screen"
- iOS: Use Share → Add to Home Screen

## 🤝 Contributing

Found a bug? Have a suggestion? Feel free to:
1. Create an issue describing the problem
2. Fork and create a feature branch
3. Submit a pull request

## 📝 License

ClipSynq is open source. See LICENSE file for details.

## 👨‍💻 Author

Created with ❤️ for seamless multi-device messaging.

## 🔗 Links

- **GitHub**: [ClipSynq Repository]
- **Firebase**: [firebase.google.com](https://firebase.google.com)
- **PWA Info**: [web.dev/progressive-web-apps](https://web.dev/progressive-web-apps)

---

**Last Updated**: December 2025  
**Version**: 2.0.0 (Production Ready)

3. **Open the app**
   - Open `index.html` in your browser
   - Or deploy to a hosting service (Vercel, Netlify, Firebase Hosting)

4. **First Login**
   - Use Google Sign-in or Email/Password authentication
   - Choose a device name
   - Done! You're ready to send messages

### Adding More Devices
1. Open ClipSynq on your second device
2. Go to the QR Code tab during login
3. On your first device, open ClipSynq and click the QR button
4. Scan the QR code with your second device
5. Approve the login request
6. Messages will now sync across both devices

## File Structure 📁

```
ClipSynq/
├── index.html              # Main app page
├── login.html              # Authentication page
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker for offline support
├── js/
│   ├── app.js             # Main app initialization
│   ├── auth.js            # Authentication logic
│   ├── auth-check.js      # Auth state verification
│   ├── messages.js        # Message management
│   ├── folders.js         # Folder operations
│   ├── devices.js         # Device management
│   ├── search.js          # Search functionality
│   ├── qr.js              # QR code generation
│   └── firebase-config.js # Firebase configuration
└── styles/
    ├── base.css           # Base styles and variables
    ├── app.css            # Main app styles
    ├── components.css     # Component styles
    ├── login.css          # Login page styles
    └── mobile.css         # Mobile responsive styles
```

## Usage Guide 📖

### Sending Messages
1. Type your message in the text area
2. Press `Ctrl+Enter` or click the send button
3. Message appears on all connected devices

### Managing Messages
- **Edit**: Click the edit icon to modify message content
- **Delete**: Click trash icon to remove message
- **Pin**: Star icon pins to the floating pinned bar
- **Star**: Yellow star highlights the message as favorite
- **Copy**: Copy message content to clipboard

### Organizing with Folders
1. Click the "+" button in the Folders section
2. Enter a folder name and choose an icon
3. Select a folder to view only messages in that folder
4. New messages will be saved to the selected folder

### Searching
1. Click the search icon
2. Type your search query
3. Results update in real-time
4. Clear search to see all messages again

### Device Management
- View all your devices in the "My Devices" section
- See device name and type
- Monitor which devices are online
- Disconnect devices as needed

## Technology Stack 🛠️

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Authentication (Google OAuth, Email/Password)
- **PWA**: Service Workers, Web App Manifest
- **UI Icons**: Font Awesome 6.4.0
- **QR Codes**: QRCode.js library

## Security & Privacy 🔒

- **End-to-End Encryption**: Messages are stored in Firebase Realtime Database
- **User Authentication**: Only authenticated users can access their messages
- **Device-Specific Access**: Each device has unique credentials
- **No Cloud Backups**: Messages are only stored in your Firebase database
- **Data Privacy**: We don't collect or share any personal data

## Features in Detail 📋

### Message Status Icons
- ✓ **Sent** - Message successfully delivered to database

### Smart Highlighting
- **Pinned Messages** - Orange border and light yellow background
- **Starred Messages** - Gold border, gradient background, and star indicator
- **Pinned + Starred** - Orange left border with premium gold gradient

### Responsive Design
- **Desktop** - Full sidebar navigation with all features visible
- **Tablet** - Optimized layout with collapsible sidebar
- **Mobile** - Hamburger menu, optimized touch targets
- **Dark Support** - Works in light and dark modes

## Troubleshooting 🔧

### Messages not syncing?
- Check internet connection
- Verify Firebase configuration
- Ensure you're logged in on both devices
- Check browser console for errors (F12)

### QR Code not working?
- Ensure camera/QR scanner permission is granted
- Try using a different device to scan
- Verify Firebase database is accessible

### PWA not installing?
- Use HTTPS (required for PWA)
- Check manifest.json is properly configured
- Clear browser cache and reload

### Login not working?
- Verify Firebase Authentication is enabled
- Check email/password credentials
- Try Google Sign-in as alternative
- Clear browser data and try again

## Browser Support 🌐

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Tips ⚡

- Messages load instantly with real-time listeners
- Star/pin operations update immediately
- Search results refresh as you type
- Service Worker enables offline browsing

## Keyboard Shortcuts ⌨️

- `Ctrl+Enter` - Send message (on desktop)
- `Shift+Enter` - New line in message
- `Enter` - Send on mobile/touch devices  
- `Escape` - Close modals
- `Tab` - Navigate between elements

## Recent Bug Fixes & Improvements 🔧

### Critical Bugs Fixed
- ✅ Fixed qr.js syntax error (double closing brace)
- ✅ Fixed message input scrollbar visibility
- ✅ Fixed hamburger menu not opening on mobile
- ✅ Fixed pinned messages bar not showing
- ✅ Fixed CSS conflicts in mobile input styles
- ✅ Fixed modal textarea scrollbar styling

### UI/UX Enhancements
- ✅ Added keyboard shortcut hints in placeholder
- ✅ Improved textarea scrollbar visibility
- ✅ Enhanced message status icons (✓ for sent)
- ✅ Better starred message highlighting
- ✅ Mobile clear button now fully visible
- ✅ Improved send button interactions

## Contributing 🤝

Found a bug or have a feature request? Feel free to:
1. Check existing issues
2. Create a detailed bug report
3. Submit a pull request with fixes

## License 📄

This project is open source and available under the MIT License.

## Credits 👏

- Built with Firebase for real-time sync
- Icons from Font Awesome
- QR Code generation using QRCode.js
- Responsive design with CSS Grid and Flexbox

## FAQ ❓

**Q: Can I use ClipSynq offline?**
A: Yes! The service worker caches content and you can browse previously loaded messages offline.

**Q: How many devices can I connect?**
A: You can connect unlimited devices to your account.

**Q: Are my messages encrypted?**
A: Messages are transmitted over HTTPS and stored in Firebase Realtime Database with security rules.

**Q: Can I delete my account?**
A: You can delete your Firebase account through your Google account settings or the Firebase console.

**Q: Is there a mobile app?**
A: ClipSynq is a PWA - install it to your home screen for an app-like experience!

## Contact & Support 📧

For issues or questions, please check the documentation or submit an issue on GitHub.

---

**Made with ❤️ for seamless message syncing**
