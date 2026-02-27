{
  "rules": {
    "users": {
      "$uid": {
        ".read": "true",
        ".write": "auth != null && auth.uid == $uid",
        
        "messages": {
          ".read": "true",
          ".write": "true",
          ".indexOn": ["timestamp", "folder", "pinned", "starred"]
        },
        
        "folders": {
          ".read": "true",
          ".write": "true",
          ".indexOn": ["createdAt"]
        },
        
        "devices": {
          ".read": "true",
          ".write": "true",
          ".indexOn": ["lastSeen", "isOnline"]
        },
        
        "global": {
          ".read": "true",
          ".write": "true",
          ".indexOn": ["timestamp"]
        }
      }
    },
    
    "qr-sessions": {
      "$sessionId": {
        ".read": "true",
        ".write": "true",
        ".indexOn": ["status", "expiresAt"]
      }
    }
  }
}
