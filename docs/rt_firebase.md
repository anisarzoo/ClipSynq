# Firebase Realtime Database Setup Guide for ClipSync

This comprehensive guide provides production-ready Firebase Realtime Database rules and step-by-step setup instructions for the ClipSync application.

## Table of Contents
1. [Quick Setup](#quick-setup)
2. [Database Structure](#database-structure)
3. [Security Rules](#security-rules)
4. [Detailed Configuration](#detailed-configuration)
5. [Testing & Verification](#testing--verification)
6. [Troubleshooting](#troubleshooting)

---

## Quick Setup

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Name it "ClipSync" (or your preference)
4. Enable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Enable Authentication
1. In Firebase Console, go to **Authentication**
2. Click **Set up sign-in method**
3. Enable:
   - **Google** (Required for QR login)
   - **Email/Password** (Required for traditional login)
4. Save

### Step 3: Create Realtime Database
1. Go to **Realtime Database**
2. Click **Create Database**
3. Select region (closest to your users)
4. Choose **Start in locked mode** (we'll add security rules next)
5. Click **Enable**

### Step 4: Add Security Rules
1. Click the **Rules** tab in Realtime Database
2. Replace all content with the rules from [Security Rules](#security-rules) section below
3. Click **Publish**
4. Wait for confirmation message

### Step 5: Get Configuration
1. Go to **Project Settings** (gear icon)
2. Under "Your apps", click the web app (or create one if needed)
3. Copy the Firebase config object
4. Update `js/firebase-config.js` with your credentials

---

## Database Structure

The ClipSync database follows this structure:

```
/
├── users
│   └── {uid}
│       ├── displayName: string
│       ├── photoURL: string
│       ├── folders
│       │   └── {folderId}
│       │       ├── name: string
│       │       ├── icon: string
│       │       └── messages
│       │           └── {messageId}
│       │               ├── text: string
│       │               ├── timestamp: number
│       │               ├── starred: boolean
│       │               ├── pinned: boolean
│       │               └── deviceId: string
│       ├── devices
│       │   └── {deviceId}
│       │       ├── name: string
│       │       ├── type: string
│       │       ├── lastSeen: number
│       │       └── isOnline: boolean
│       └── qrSessions
│           └── {sessionId}
│               ├── code: string
│               ├── expiresAt: number
│               ├── verified: boolean
│               └── uid: string

├── qrCodes
│   └── {qrId}
│       ├── uid: string
│       ├── expiresAt: number
│       └── verified: boolean

└── appConfig
    ├── version: string
    └── features
        └── installApp: boolean
```

### Key Principles

**User Isolation**: Each user can only read/write their own data under `/users/{uid}`

**Real-time Sync**: Changes to messages, folders, and devices propagate instantly to all user's devices

**Session Management**: QR codes expire after 10 minutes and can only be used once

**Device Tracking**: Online status and last-seen timestamps maintained automatically

---

## Security Rules

### Production-Ready Rules (Copy & Paste)

```json
{
  "rules": {
    "users": {
      "$uid": {
        // User can only access their own data
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid",
        
        "displayName": {
          ".validate": "newData.isString() && newData.val().length <= 100"
        },
        
        "photoURL": {
          ".validate": "newData.isString() && newData.val().length <= 500"
        },
        
        "folders": {
          "$folderId": {
            ".validate": "newData.hasChildren(['name', 'icon'])",
            "name": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 30"
            },
            "icon": {
              ".validate": "newData.isString() && newData.val().length <= 30"
            },
            "messages": {
              "$messageId": {
                ".validate": "newData.hasChildren(['text', 'timestamp']) || newData.hasChildren(['starred']) || newData.hasChildren(['pinned'])",
                "text": {
                  ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 5000"
                },
                "timestamp": {
                  ".validate": "newData.isNumber()"
                },
                "starred": {
                  ".validate": "newData.isBoolean()"
                },
                "pinned": {
                  ".validate": "newData.isBoolean()"
                },
                "deviceId": {
                  ".validate": "newData.isString()"
                }
              }
            }
          }
        },
        
        "devices": {
          "$deviceId": {
            ".validate": "newData.hasChildren(['name', 'type'])",
            "name": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50"
            },
            "type": {
              ".validate": "newData.val() === 'desktop' || newData.val() === 'mobile' || newData.val() === 'tablet'"
            },
            "lastSeen": {
              ".validate": "newData.isNumber()"
            },
            "isOnline": {
              ".validate": "newData.isBoolean()"
            }
          }
        },
        
        "qrSessions": {
          "$sessionId": {
            ".validate": "newData.hasChildren(['code', 'expiresAt'])",
            "code": {
              ".validate": "newData.isString() && newData.val().length === 6"
            },
            "expiresAt": {
              ".validate": "newData.isNumber() && newData.val() > now"
            },
            "verified": {
              ".validate": "newData.isBoolean()"
            },
            "uid": {
              ".validate": "newData.isString() || newData.val() === null"
            }
          }
        }
      }
    },
    
    "qrCodes": {
      "$qrId": {
        ".read": "true",
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['uid', 'expiresAt'])",
        "uid": {
          ".validate": "newData.isString()"
        },
        "expiresAt": {
          ".validate": "newData.isNumber() && newData.val() > now"
        },
        "verified": {
          ".validate": "newData.isBoolean()"
        }
      }
    },
    "globalMessages": {
      ".read": true,
      ".write": false,
      "$msgId": {
        ".read": true,
        ".write": "auth != null || (!data.exists() && newData.exists() && newData.child('clientId').isString() && newData.child('clientId').val().length > 0)",
        ".validate": "newData.hasChildren(['content','timestamp','name']) && newData.child('content').isString() && newData.child('content').val().length > 0 && newData.child('content').val().length <= 1000 && newData.child('timestamp').isNumber() && newData.child('name').isString() && (newData.child('uid').isString() || newData.child('clientId').isString())",
        "uid": {
          ".validate": "!newData.exists() || newData.isString() || newData.val() === null"
        },
        "content": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 1000"
        },
        "timestamp": {
          ".validate": "newData.isNumber() && newData.val() > 0"
        },
        "name": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
        },
        "photoURL": {
          ".validate": "!newData.exists() || (newData.isString() && newData.val().length > 0 && newData.val().length <= 500)"
        },
        "clientId": {
          ".validate": "!newData.exists() || (newData.isString() && newData.val().length > 0)"
        },
        "category": {
          ".validate": "!newData.exists() || (newData.isString() && (newData.val() === 'general' || newData.val() === 'resources' || newData.val() === 'help' || newData.val() === 'ideas' || newData.val() === 'links' || newData.val() === 'announcements'))"
        }
      }
    },
    
    "appConfig": {
      ".read": "true",
      ".write": "false"
    }
  }
}
```

### Rule Explanation

**User Data Protection**
- `.read` and `.write` both check `auth.uid === $uid`
- Users can only access their own data
- Prevents cross-user data access

**Message Validation**
- Text must be non-empty string, max 5000 characters
- Timestamp must be numeric (milliseconds since epoch)
- Starred and pinned are boolean flags
- Device ID links message to source device

**Device Management**
- Device must have name and type
- Type limited to: desktop, mobile, tablet
- LastSeen and isOnline track device state

**QR Code Security**
- QR codes can be read by anyone (for QR scanning)
- Only authenticated users can create
- Code must be exactly 6 characters
- Expiration prevents old codes from working
- `expiresAt > now` ensures expired codes fail

**Wildcard Patterns**
- `$uid`: Each user ID
- `$folderId`: Each folder ID
- `$messageId`: Each message ID
- `$deviceId`: Each device ID
- `$sessionId`: Each QR session ID
- `$qrId`: Each QR code ID

---

## Detailed Configuration

### Firebase Config File Setup

Update `js/firebase-config.js`:

```javascript
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const database = getDatabase(app);
```

**Where to find these values:**
1. Go to Firebase Console → Project Settings
2. Under "Your apps", find the web app
3. Click the config icon to show Firebase SDK snippet
4. Copy values from the `firebaseConfig` object

### Authentication Setup

#### Google OAuth
1. Firebase Console → Authentication → Sign-in method
2. Select Google
3. Provide a support email
4. Save

#### Email/Password
1. Firebase Console → Authentication → Sign-in method
2. Select Email/Password
3. Enable both options:
   - ☑ Email/Password
   - ☑ Email link (passwordless sign-in)
4. Save

### Database Rules Deployment Checklist

- [ ] Security Rules are published (not locked mode)
- [ ] User data paths validate with `auth.uid === $uid`
- [ ] Message structure includes all required fields
- [ ] Device tracking fields present
- [ ] QR code expiration validation active
- [ ] Test read/write operations succeed
- [ ] Unauthorized users blocked appropriately

---

## Testing & Verification

### Test 1: Authentication Flow

```javascript
// Test email/password signup
import { createUserWithEmailAndPassword } from "firebase-auth";
await createUserWithEmailAndPassword(auth, "test@example.com", "password123");

// Test Google sign-in (automatic in ClipSync)
// Test logout
await signOut(auth);
```

**Expected Result**: User created in Authentication tab of Firebase Console

### Test 2: Write User Data

```javascript
import { ref, set } from "firebase-database";

const userRef = ref(database, `users/${auth.currentUser.uid}`);
await set(userRef, {
    displayName: "Test User",
    photoURL: "https://example.com/photo.jpg"
});
```

**Expected Result**: Data appears in Realtime Database under `/users/{uid}`

### Test 3: Create Folder and Message

```javascript
const folderRef = ref(database, 
    `users/${uid}/folders/${folderId}`
);
await set(folderRef, {
    name: "Test Folder",
    icon: "folder",
    messages: {
        msg1: {
            text: "Hello ClipSync",
            timestamp: Date.now(),
            starred: false,
            pinned: false,
            deviceId: "device-1"
        }
    }
});
```

**Expected Result**: Folder and message visible in database tree

### Test 4: Device Sync

1. Open ClipSync on Device A
2. Send a message from Device A
3. Open ClipSync on Device B (different browser/device)
4. Verify message appears instantly on Device B
5. Mark message as starred on Device B
6. Verify starred status updates on Device A in real-time

**Expected Result**: Real-time synchronization works across devices

### Test 5: QR Code Session

```javascript
// Generate QR session
const sessionRef = ref(database, `users/${uid}/qrSessions/${sessionId}`);
await set(sessionRef, {
    code: "123456",
    expiresAt: Date.now() + 600000, // 10 minutes
    verified: false
});

// Verify QR
const verified = ref(database, `users/${uid}/qrSessions/${sessionId}/verified`);
await set(verified, true);
```

**Expected Result**: QR session created, can be scanned and verified

### Test 6: Security - Unauthorized Access

Attempt to read another user's data:

```javascript
const otherUserRef = ref(database, `users/different-uid/messages`);
const snapshot = await get(otherUserRef);
// This should FAIL (Permission denied error)
```

**Expected Result**: Operation fails with permission denied

### Test 7: Message Validation

Try to create an invalid message:

```javascript
// Missing required timestamp field
const invalidRef = ref(database, 
    `users/${uid}/folders/${folderId}/messages/msg1`
);
await set(invalidRef, {
    text: "No timestamp"
    // Missing timestamp - should fail
});
```

**Expected Result**: Operation fails due to validation rules

### Live Testing Checklist

- [ ] Create user account with email/password
- [ ] Create user account with Google
- [ ] Create folder on Device A
- [ ] Message appears on Device B instantly
- [ ] Star message on Device B
- [ ] Starred status reflects on Device A instantly
- [ ] Edit message on Device A
- [ ] Edit appears on Device B instantly
- [ ] Pin message
- [ ] Pin status syncs across devices
- [ ] Generate QR code
- [ ] Scan QR on new device
- [ ] New device receives all messages
- [ ] Delete device from one, reflects on all

---

## Troubleshooting

### Problem: "Permission Denied" Error

**Causes:**
1. User not authenticated
2. Security rules don't allow operation
3. User UID mismatch

**Solution:**
1. Verify user is logged in: `console.log(auth.currentUser)`
2. Check Firebase Console → Database → Rules
3. Verify rule allows operation for authenticated users
4. Check browser console for detailed error message

**Debug Code:**
```javascript
if (!auth.currentUser) {
    console.error("User not authenticated");
} else {
    console.log("Current UID:", auth.currentUser.uid);
}
```

### Problem: Messages Not Syncing to New Device

**Causes:**
1. QR code not verified
2. New device not authenticated
3. Device ID mismatch

**Solution:**
1. Verify QR code shows completed check
2. Clear browser cache and refresh
3. Check that new device has same user logged in
4. Verify Device B appears in "My Devices" list

### Problem: Slow Real-time Updates

**Causes:**
1. Internet connection issues
2. Large database size
3. Complex query filters

**Solution:**
1. Test network connectivity
2. Reduce number of messages per page (pagination)
3. Use `.limitToLast(50)` in database queries
4. Check Firebase Spark Plan limits (1GB free, 100 connections)

### Problem: QR Code Expires Too Quickly

**Causes:**
1. Expiration time set too short
2. Server time mismatch

**Solution:**
1. Increase expiration in code:
   ```javascript
   expiresAt: Date.now() + 1800000 // 30 minutes
   ```
2. Verify server time synced with Firebase
3. Use `now` constant in rules (Firebase server time)

### Problem: Can't Create Folder

**Causes:**
1. Invalid folder name (too long, empty)
2. Missing required fields
3. User not authenticated

**Solution:**
1. Check folder name 1-30 characters
2. Ensure `name` and `icon` fields present
3. Verify user logged in
4. Check browser console for validation errors

### Problem: Install Button Not Showing

**Causes:**
1. Not on HTTPS (PWA requirement)
2. manifest.json invalid
3. Service worker not registered

**Solution:**
1. Deploy to HTTPS host (Firebase Hosting, Netlify, Vercel)
2. Verify manifest.json exists and is valid
3. Check browser console: `navigator.serviceWorker.ready`
4. Firefox/Chrome may require different install approaches

**Note:** Install button works on:
- ✅ HTTPS hosted sites
- ✅ localhost (for testing)
- ❌ HTTP
- ❌ file:// protocol

### Problem: Device Not Showing as Online

**Causes:**
1. Device connection interrupted
2. Database update failed
3. Real-time listener not attached

**Solution:**
1. Check network connection
2. Verify `updateDeviceStatus()` called on interval
3. Check that `onValue()` listener active
4. Check browser console for errors

---

## Advanced Configuration

### Custom User Profile Fields

To add fields like phone number or profile bio:

1. Update database rules to allow new fields
2. Update validation in rules
3. Update UI to collect data

**Example - Add Phone Number:**

```json
"phone": {
  ".validate": "newData.isString() && newData.val().length <= 20"
}
```

### Message Encryption (Optional)

For sensitive messages, implement client-side encryption:

```javascript
// Before sending to database
const encrypted = CryptoJS.AES.encrypt(message, encryptionKey).toString();

// After retrieving from database
const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey)
    .toString(CryptoJS.enc.Utf8);
```

### Backup Strategy

1. Enable automatic backups in Firebase Console
2. Export data regularly
3. Test restore procedures
4. Keep backups in multiple locations

---

## Support & Resources

- **Firebase Documentation**: https://firebase.google.com/docs/database
- **Security Rules Guide**: https://firebase.google.com/docs/rules
- **Firebase Limits**: https://firebase.google.com/docs/firestore/quotas
- **Community Forum**: https://stackoverflow.com/questions/tagged/firebase-realtime-database

---

**Last Updated**: 2024
**Firebase SDK Version**: 10.7.1
**Database Type**: Realtime Database
**Rule Status**: Production-Ready ✅
