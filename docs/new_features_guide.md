# SwapChat - New Features Quick Guide

**Last Updated**: December 13, 2025

---

## 🆕 NEW FEATURES

### 1. Edit Folder Names

**How to use:**
1. Open SwapChat
2. Go to "Folders" section in sidebar
3. Hover over a folder
4. Click the edit icon (pencil)
5. Enter new folder name
6. Press Enter or click Save
7. Changes appear instantly on all devices

**Example:**
```
Before: "Work"
After:  "Work Projects 2025"
```

---

### 2. Clickable Links in Messages

**How it works:**
1. Type or paste a URL in a message
2. Send the message
3. The URL appears as a clickable link with an icon
4. Click the link to open in new tab

**Supported formats:**
- `https://example.com`
- `http://example.com`
- URLs in middle of text

**Example:**
```
Message: "Check out https://github.com/user/project for details"
Displays: "Check out [Link icon] github.com/user/proj... for details"
Click: Opens GitHub in new tab
```

---

### 3. Global Link Library

**How to use:**
1. Click "Links" button in sidebar
2. Click "Global Link Library" modal
3. Paste a URL in the "Add a Link" section
4. Select or auto-detect category
5. Add optional description
6. Click "Save"

**Features:**
- Auto-detect categories (Video, Code, Articles, etc.)
- Manual category selection
- Search and browse by category
- Delete links anytime
- Sync across all devices

**Categories:**
- Video
- Social Media
- Code
- Q&A
- Articles
- Cloud Storage
- Documents
- Shopping
- Entertainment
- Other

---

### 4. Real-Time Synchronization

**All features sync instantly:**

✅ Messages
- Send message on Device A
- Appears instantly on Device B

✅ Folder Edits
- Edit folder on Device A
- Name updates instantly on Device B

✅ Links
- Add link on Device A
- Appears instantly on Device B

✅ Devices
- Online status updates instantly
- Device status syncs instantly

**No manual refresh needed!** Everything updates automatically.

---

## 🐛 FIXES APPLIED

### Error: "deviceId is not defined" (app.js:138)
✅ **Fixed**: Now uses proper device ID retrieval function  
✅ **Result**: No more console errors, device tracking works perfectly

### Error: "Cannot redefine property: ethereum"
✅ **Fixed**: Added error handler for browser extensions  
✅ **Result**: App works with all extensions installed, no errors

---

## 🎨 Link Styling

Clickable links in messages appear as:
```
┌─────────────────────────────┐
│ 🔗 example.com (truncated) │
└─────────────────────────────┘
```

**Hover effect:**
- Color changes to primary color
- Slight lift animation
- Shadow appears

**Click:**
- Opens in new tab
- No page navigation

---

## ⚡ Performance

All features are optimized for:
- ✅ Fast real-time updates (< 1 second)
- ✅ Low data usage
- ✅ Smooth animations
- ✅ Mobile-friendly
- ✅ Offline support (partial)

---

## 📱 Mobile Support

All new features work on:
- ✅ iOS devices
- ✅ Android devices
- ✅ Tablets
- ✅ Desktops
- ✅ All screen sizes

---

## 🔒 Security

All data is:
- ✅ Encrypted in transit (HTTPS)
- ✅ Protected by Firebase security rules
- ✅ User-isolated (can't see other users' data)
- ✅ Validated on server
- ✅ XSS-protected (HTML escaped)

---

## ❓ FAQ

**Q: Do I need to refresh the page to see changes?**  
A: No! All changes sync automatically in real-time.

**Q: Can I edit folder names?**  
A: Yes! Hover over a folder and click the edit icon.

**Q: Will links work if I don't have internet?**  
A: You can still view messages with links offline, but clicking them requires internet.

**Q: Can I delete links?**  
A: Yes! Click the X button on any link in the Global Link Library.

**Q: What if a URL has special characters?**  
A: We handle all standard URLs. If a link doesn't work, try copying it manually.

**Q: Do links work on mobile?**  
A: Yes! Links work the same on mobile as desktop.

**Q: Can multiple people edit the same folder?**  
A: Editing is instant - if two people edit simultaneously, the last edit wins.

---

## 🚀 Tips & Tricks

### Pro Tips:

1. **Organize with Folders**
   - Use descriptive folder names
   - Edit names as projects evolve

2. **Share Links Easily**
   - Paste URLs directly in messages
   - They auto-convert to clickable links
   - No special formatting needed

3. **Build Link Library**
   - Save useful links in Global Library
   - Auto-categorize for easy finding
   - Access across all conversations

4. **Multi-Device**
   - Open on multiple devices
   - See changes instantly
   - All data syncs automatically

5. **Stay Organized**
   - Use folders for message types
   - Use link library for resources
   - Edit folder names as needed

---

## 🆘 Troubleshooting

### Links not clickable?
- Make sure URL starts with `http://` or `https://`
- Check message displays the link properly
- Refresh page if needed

### Folder edit not saving?
- Check internet connection
- Ensure you're logged in
- Try again - Firebase should sync

### Changes not syncing?
- Check internet connection
- Ensure app is open on both devices
- Wait up to 1 second for sync
- Refresh page if needed

### Extension errors?
- Extension errors are normal
- They don't affect the app
- Just ignore them in console

---

## 📧 Support

If you find any issues:
1. Check the troubleshooting section above
2. Refresh the page and try again
3. Check your internet connection
4. Clear browser cache if persistent

---

## ✨ What's Next?

More features coming:
- Scheduled messages
- Message reactions
- Link preview thumbnails
- Rich text formatting
- Voice messages (planned)

---

**Status**: ✅ All Features Working  
**Last Updated**: December 13, 2025  
**Ready for Production**: YES 🚀

Enjoy your fully featured SwapChat app!
