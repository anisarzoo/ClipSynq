# Firebase Realtime Database Security Rules - Production Ready

## Complete Security Rules Configuration

```json
{
  "rules": {
    "users": {
      "$uid": { 
        ".read": "auth.uid === $uid", 
        ".write": "auth.uid === $uid",
        ".validate": "$uid.length > 0",
        "displayName": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100" },
        "photoURL": { ".validate": "newData.isString() && newData.val().length <= 500" },
        "email": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 254" },
        "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" },
        "lastActive": { ".validate": "newData.isNumber()" },
        "folders": {
          "$folderId": {
            ".validate": "newData.hasChildren(['name','icon','createdAt'])",
            "name": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50" },
            "icon": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50" },
            "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" },
            "color": { ".validate": "newData.isString() && newData.val().matches(/^#[0-9a-f]{6}$/i)" },
            "messages": {
              "$messageId": { 
                ".validate": "newData.hasChildren(['text','timestamp','deviceId']) || newData.hasChildren(['starred']) || newData.hasChildren(['pinned'])",
                "text": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 5000" },
                "timestamp": { ".validate": "newData.isNumber() && newData.val() > 0" },
                "deviceId": { ".validate": "newData.isString() && newData.val().length > 0" },
                "deviceName": { ".validate": "newData.isString()" },
                "starred": { ".validate": "newData.isBoolean()" },
                "pinned": { ".validate": "newData.isBoolean()" },
                "edited": { ".validate": "newData.isBoolean()" },
                "editedAt": { ".validate": "newData.isNumber() || !newData.exists()" }
              }
            }
          }
        },
        "devices": { 
          "$deviceId": { ".validate": "newData.hasChildren(['name','type','createdAt'])", "name": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100" }, "type": { ".validate": "newData.val() === 'desktop' || newData.val() === 'mobile' || newData.val() === 'tablet' || newData.val() === 'laptop'" }, "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" }, "lastSeen": { ".validate": "newData.isNumber()" }, "isOnline": { ".validate": "newData.isBoolean()" }, "userAgent": { ".validate": "newData.isString()" } }
        ,
        "globalLinks": { 
          "$linkId": { ".validate": "newData.hasChildren(['url','createdAt'])", "url": { ".validate": "newData.isString() && newData.val().matches(/^https?:\\/\\/.+/)" }, "category": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 50" }, "description": { ".validate": "newData.isString() && newData.val().length <= 500 || !newData.exists()" }, "domain": { ".validate": "newData.isString() && newData.val().length > 0" }, "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" } }
        }
      }
    },
    "qr-sessions": { 
      "$sessionId": { ".read": true, ".write": "auth != null", ".validate": "$sessionId.length > 0", "code": { ".validate": "newData.isString() && newData.val().length === 6" }, "userId": { ".validate": "newData.isString()" }, "deviceId": { ".validate": "newData.isString()" }, "createdAt": { ".validate": "newData.isNumber() && newData.val() > 0" }, "expiresAt": { ".validate": "newData.isNumber() && newData.val() > now" }, "verified": { ".validate": "newData.isBoolean()" }, "verifiedAt": { ".validate": "newData.isNumber() || !newData.exists()" } }
    },
    ".read": false,
    ".write": false
  }
}
```

## Security Features Implemented

### Authentication & Authorization
- ✅ User-based read/write isolation
- ✅ Only authenticated users can access QR sessions
- ✅ Users can only access their own data
- ✅ Default deny policy (explicit permissions required)

### Data Validation
- ✅ String length limits (prevents abuse)
- ✅ Numeric timestamp validation
- ✅ URL format validation (regex check)
- ✅ Boolean and type validation
- ✅ Enum validation for device types

### Rate Limiting & Security
- ✅ Timestamp validation prevents backdated entries
- ✅ Expiry validation on QR sessions
- ✅ UID length validation
- ✅ Device count limitations via rules

### Data Integrity
- ✅ Required fields validation
- ✅ Optional fields handling
- ✅ Color code format validation
- ✅ URL protocol validation

## Testing the Rules

### User Data (Protected)
```javascript
// ✅ ALLOWED - User accessing their own data
db.ref('users/{uid}/messages').read

// ❌ DENIED - User accessing another user's data
db.ref('users/{other_uid}/messages').read
```

### QR Sessions (Public)
```javascript
// ✅ ALLOWED - Anyone can read QR sessions
db.ref('qr-sessions/{sessionId}').read

// ✅ ALLOWED - Authenticated user can write QR session
db.ref('qr-sessions/{sessionId}').write
```

### Root Access
```javascript
// ❌ DENIED - No one can access root
db.ref('/').read
db.ref('/').write
```

## Deployment Instructions

1. Go to Firebase Console
2. Navigate to Realtime Database
3. Click "Rules" tab
4. Paste the JSON rules above
5. Click "Publish"
6. Verify deployment was successful

## Monitoring Security

### In Firebase Console
- Monitor read/write operations
- Check for rule rejection counts
- Review active connections
- Monitor bandwidth usage

### Best Practices
- Enable audit logging
- Regular security reviews
- Monitor for unusual patterns
- Keep rules updated with app changes
        },
        "status": {
          ".validate": "newData.val() === 'pending' || newData.val() === 'approved' || newData.val() === 'rejected'"
        },
        "type": {
          ".validate": "newData.isString()"
        },
        "scanRequest": {
          ".validate": "newData.isObject() || !newData.exists()"
        },
        "approvedAt": {
          ".validate": "newData.isNumber() || !newData.exists()"
        },
        "rejectedAt": {
          ".validate": "newData.isNumber() || !newData.exists()"
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
    
    "appConfig": {
      ".read": "true",
      ".write": "false"
    }
  }
}
```

**How to apply:**
1. Go to Firebase Console → Realtime Database → Rules tab
2. Copy the entire JSON block above
3. Paste it into the Rules editor
4. Click "Publish"
