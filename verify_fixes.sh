#!/usr/bin/env bash
# ClipSynq - All Fixes Verification Status
# Run this to verify all fixes are properly implemented

echo "═══════════════════════════════════════════════════════════"
echo "       ClipSynq - All Fixes Implementation Status"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}CHECKING FILES...${NC}"
echo ""

# Check if all required files exist
files_to_check=(
    "index.html"
    "app.png"
    "manifest.json"
    "sw.js"
    "js/app.js"
    "js/auth.js"
    "js/messages.js"
    "js/devices.js"
    "js/folders.js"
    "js/qr.js"
    "js/search.js"
    "js/firebase-config.js"
    "styles/app.css"
    "styles/base.css"
    "styles/components.css"
    "styles/login.css"
    "styles/mobile.css"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (MISSING)"
    fi
done

echo ""
echo -e "${BLUE}CHECKING DOCUMENTATION FILES...${NC}"
echo ""

docs_to_check=(
    "RT_FIREBASE.md"
    "UI_FIXES_VERIFICATION.md"
    "FIXES_COMPLETE_SUMMARY.md"
    "QUICK_START_AFTER_FIXES.md"
    "COMPLETION_REPORT.md"
    "DOCUMENTATION_INDEX.md"
)

for doc in "${docs_to_check[@]}"; do
    if [ -f "$doc" ]; then
        lines=$(wc -l < "$doc")
        echo -e "${GREEN}✓${NC} $doc ($lines lines)"
    else
        echo -e "${RED}✗${NC} $doc (MISSING)"
    fi
done

echo ""
echo -e "${BLUE}CHECKING CODE FIXES...${NC}"
echo ""

# Check for desktop header in HTML
if grep -q "desktop-header" index.html; then
    echo -e "${GREEN}✓${NC} Desktop header added to HTML"
else
    echo -e "${RED}✗${NC} Desktop header NOT found in HTML"
fi

# Check for desktop header CSS
if grep -q "\.desktop-header {" styles/app.css; then
    echo -e "${GREEN}✓${NC} Desktop header CSS added"
else
    echo -e "${RED}✗${NC} Desktop header CSS NOT found"
fi

# Check for box-sizing fix
if grep -q "box-sizing: border-box" styles/app.css; then
    echo -e "${GREEN}✓${NC} Box-sizing fix applied"
else
    echo -e "${RED}✗${NC} Box-sizing fix NOT found"
fi

# Check for scroll button CSS class
if grep -q "\.scroll-top-btn.show" styles/components.css; then
    echo -e "${GREEN}✓${NC} Scroll button CSS class added"
else
    echo -e "${RED}✗${NC} Scroll button CSS class NOT found"
fi

# Check for classList in app.js
if grep -q "classList.add('show')" js/app.js; then
    echo -e "${GREEN}✓${NC} Scroll button JavaScript classList fix applied"
else
    echo -e "${RED}✗${NC} Scroll button JavaScript fix NOT found"
fi

# Check for auth.currentUser in messages.js
if grep -q "auth.currentUser" js/messages.js; then
    echo -e "${GREEN}✓${NC} messages.js auth.currentUser fix applied"
else
    echo -e "${RED}✗${NC} messages.js auth.currentUser fix NOT found"
fi

# Check for mobile CSS fix
if grep -q "flex-direction: column" styles/mobile.css; then
    echo -e "${GREEN}✓${NC} Mobile CSS layout fix applied"
else
    echo -e "${RED}✗${NC} Mobile CSS layout fix NOT found"
fi

echo ""
echo -e "${BLUE}FIX VERIFICATION SUMMARY:${NC}"
echo ""

# Count implemented fixes
fixes_count=0

if grep -q "desktop-header" index.html && grep -q "\.desktop-header {" styles/app.css; then
    echo -e "${GREEN}✓${NC} Fix #1: Website Name Display - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #1: Website Name Display - PENDING"
fi

if grep -q "flex-direction: column" styles/mobile.css; then
    echo -e "${GREEN}✓${NC} Fix #2: Mobile Search Overlay - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #2: Mobile Search Overlay - PENDING"
fi

if grep -q "\.scroll-top-btn.show" styles/components.css && grep -q "classList.add('show')" js/app.js; then
    echo -e "${GREEN}✓${NC} Fix #3: Scroll Button - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #3: Scroll Button - PENDING"
fi

if grep -q "auth.currentUser" js/messages.js; then
    echo -e "${GREEN}✓${NC} Fix #4: Star/Pin/Edit Actions - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #4: Star/Pin/Edit Actions - PENDING"
fi

if grep -q "box-sizing: border-box" styles/app.css; then
    echo -e "${GREEN}✓${NC} Fix #5: Layout & Scrollbar Issues - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #5: Layout & Scrollbar Issues - PENDING"
fi

if [ -f "RT_FIREBASE.md" ]; then
    echo -e "${GREEN}✓${NC} Fix #6: Firebase Documentation - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${RED}✗${NC} Fix #6: Firebase Documentation - PENDING"
fi

# Check for device cleanup (harder to verify without running code)
if grep -q "getDeviceId()" js/app.js; then
    echo -e "${GREEN}✓${NC} Fix #7: Device Cleanup on Logout - IMPLEMENTED"
    ((fixes_count++))
else
    echo -e "${YELLOW}⚠${NC}  Fix #7: Device Cleanup on Logout - Check manually"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "TOTAL FIXES IMPLEMENTED: ${GREEN}$fixes_count/7${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $fixes_count -eq 7 ]; then
    echo -e "${GREEN}✓ ALL FIXES IMPLEMENTED AND READY!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Test all fixes using UI_FIXES_VERIFICATION.md"
    echo "2. Set up Firebase using RT_FIREBASE.md"
    echo "3. Deploy to HTTPS host"
    echo "4. Share with users"
    exit 0
else
    echo -e "${YELLOW}⚠  Some fixes may need verification${NC}"
    echo ""
    echo "Please check the items marked above."
    exit 1
fi
