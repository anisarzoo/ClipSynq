# Quick Reference: Modern UI Components

## 🎨 CSS Classes Reference

### Buttons

```html
<!-- Primary Button -->
<button class="btn primary">Primary Action</button>

<!-- Secondary Button -->
<button class="btn secondary">Secondary Action</button>

<!-- Danger Button -->
<button class="btn danger">Delete</button>

<!-- Success Button -->
<button class="btn success">Confirm</button>

<!-- Loading State -->
<button class="btn loading" disabled>Processing...</button>

<!-- Share Link Button -->
<button id="shareLinkBtn">Save Link</button>
```

### Form Controls

```html
<!-- Form Group -->
<div class="form-group">
    <label>Field Label</label>
    <input class="link-input" type="text" placeholder="Enter value">
</div>

<!-- Select Dropdown -->
<select class="link-category-select">
    <option value="">Auto-detect</option>
    <option value="Video">Video</option>
    <option value="Article">Article</option>
</select>

<!-- Text Area -->
<textarea class="link-input" placeholder="Description"></textarea>
```

### Modals & Panels

```html
<!-- Modal -->
<div id="linksModal" class="modal">
    <div class="modal-content">
        <button class="close-modal">×</button>
        <h2>Modal Title</h2>
        <!-- Content here -->
    </div>
</div>

<!-- Link Sharing Panel -->
<div class="link-sharing-panel">
    <h3>Share Link</h3>
    <!-- Input groups here -->
</div>
```

### Lists & Items

```html
<!-- Link Item -->
<div class="link-item">
    <div class="link-info">
        <a class="link-url" href="#">example.com</a>
        <span class="link-date">Today at 2:30 PM</span>
    </div>
    <button class="delete-link-btn">×</button>
</div>

<!-- List Item -->
<div class="list-item">Item content</div>

<!-- List Item Active -->
<div class="list-item active">Selected Item</div>
```

### Status & Indicators

```html
<!-- Badge -->
<span class="badge">New</span>
<span class="badge success">Done</span>
<span class="badge danger">Urgent</span>

<!-- Status Indicator -->
<span class="status-online">Online</span>
<span class="status-offline">Offline</span>

<!-- Chip -->
<div class="chip">Tag Content</div>
<div class="chip primary">Primary Tag</div>
```

### Notifications

```html
<!-- Alert -->
<div class="alert success">Operation successful!</div>
<div class="alert danger">An error occurred</div>
<div class="alert warning">Warning message</div>
<div class="alert info">Information</div>

<!-- Toast (same styling as alert) -->
<div class="toast success">Link saved!</div>
```

### Dropdowns

```html
<!-- Dropdown Container -->
<div class="dropdown">
    <button class="dropdown-toggle">Menu</button>
    <div class="dropdown-menu">
        <div class="dropdown-item">Option 1</div>
        <div class="dropdown-item active">Option 2</div>
        <div class="dropdown-item">Option 3</div>
    </div>
</div>
```

### Cards & Containers

```html
<!-- Card -->
<div class="card">
    <h3>Card Title</h3>
    <p>Card content</p>
</div>

<!-- Divider -->
<div class="divider"></div>
```

## 🎬 Animations

### CSS Animation Classes

```css
/* Apply animations directly */
.element {
    animation: fadeInUp 0.3s ease;
}

/* Stagger multiple items */
.item:nth-child(1) { animation-delay: 0s; }
.item:nth-child(2) { animation-delay: 0.1s; }
.item:nth-child(3) { animation-delay: 0.2s; }
```

### Available Animations

```
fadeInUp       - Fade in while sliding up
fadeInDown     - Fade in while sliding down
slideInLeft    - Slide in from left
slideDown      - Quick slide down (dropdowns)
pulse          - Pulsing effect (status)
shimmer        - Loading skeleton
spin           - Loading spinner
```

## 🎨 Color Variables

### How to Use

```css
/* Primary color */
color: var(--primary);           /* #0ea5e9 */
background: var(--primary-dark); /* #0284c7 */
border-color: var(--secondary);  /* #06b6d4 */

/* Status colors */
color: var(--success);  /* #10b981 */
color: var(--danger);   /* #ef4444 */
color: var(--warning);  /* #f59e0b */

/* Text colors */
color: var(--dark);        /* #0f172a */
color: var(--text);        /* #334155 */
color: var(--text-light);  /* #64748b */
color: var(--text-muted);  /* #94a3b8 */

/* Background & border */
background: var(--light);        /* #f1f5f9 */
background: var(--light-2);      /* #e2e8f0 */
background: var(--light-3);      /* #cbd5e1 */
border-color: var(--border);     /* #e2e8f0 */
```

## 📐 Spacing & Sizing

### Border Radius

```css
border-radius: var(--radius-sm);  /* 8px */
border-radius: var(--radius);     /* 12px */
border-radius: var(--radius-lg);  /* 16px */
border-radius: var(--radius-xl);  /* 20px */
```

### Shadows

```css
box-shadow: var(--shadow-sm);  /* 0 2px 4px */
box-shadow: var(--shadow);     /* 0 4px 6px */
box-shadow: var(--shadow-lg);  /* 0 10px 15px */
box-shadow: var(--shadow-xl);  /* 0 20px 25px */
```

### Transitions

```css
transition: var(--transition);  /* all 0.3s ease */
```

## 🖱️ Interactive States

### Button States

```css
.btn {
    /* Default */
    background: gradient;
    box-shadow: shadow;
}

.btn:hover {
    /* Hover - Lift 2px */
    transform: translateY(-2px);
    box-shadow: enhanced-shadow;
}

.btn:active {
    /* Click - Return to baseline */
    transform: translateY(0);
    box-shadow: reduced-shadow;
}

.btn:disabled {
    /* Disabled */
    opacity: 0.6;
    cursor: not-allowed;
}
```

### Input Focus States

```css
input:focus,
textarea:focus,
select:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
                0 0 0 1px rgba(59, 130, 246, 0.2);
    outline: none;
}
```

### Hover Effects

```css
/* List item hover */
.link-item:hover {
    transform: translateX(2px);
    border-color: var(--secondary);
    box-shadow: enhanced;
}

/* Delete button hover */
.delete-link-btn:hover {
    transform: scale(1.05);
    color: var(--danger);
}
```

## 📱 Responsive Design

### Breakpoints

```css
/* Mobile */
@media (max-width: 480px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large displays */
@media (min-width: 1366px) { }
```

## 🔧 Customization Examples

### Change Primary Color

```css
:root {
    --primary: #your-color;
    --primary-dark: #darker-shade;
}
```

### Adjust Animation Speed

```css
:root {
    --transition: all 0.5s ease; /* Slower */
}
```

### Disable Animations

```css
@media (prefers-reduced-motion: reduce) {
    * {
        animation: none !important;
        transition: none !important;
    }
}
```

## 📋 Common Patterns

### Modal with Form

```html
<div id="myModal" class="modal">
    <div class="modal-content">
        <button class="close-modal">×</button>
        <h2>Form Title</h2>
        
        <div class="form-group">
            <label>Input Label</label>
            <input class="link-input" type="text">
        </div>
        
        <button class="btn primary">Submit</button>
    </div>
</div>
```

### Link List with Category

```html
<div class="links-category">
    <h3 class="links-category-title">
        <i>🔗</i> Videos
    </h3>
    
    <div class="link-item">
        <div class="link-info">
            <a class="link-url" href="#">example.com</a>
            <span class="link-date">Today</span>
        </div>
        <button class="delete-link-btn">×</button>
    </div>
</div>
```

### Notification Toast

```html
<div class="toast success">
    ✓ Action completed successfully
</div>

<div class="toast danger">
    ✕ Error occurred
</div>
```

## 🧪 Testing Checklist

- [ ] All buttons have hover states
- [ ] Form inputs show focus rings
- [ ] Animations are smooth
- [ ] Colors have sufficient contrast
- [ ] Delete buttons work properly
- [ ] Modals animate correctly
- [ ] Responsive on mobile
- [ ] Keyboard navigation works
- [ ] Touch targets are 32px minimum
- [ ] No layout shifts during animations

## 📞 Need Help?

- Check **UI_MODERNIZATION.md** for detailed guide
- Review **MODERN_UI_SHOWCASE.md** for visual examples
- See **MODERNIZATION_SUMMARY.md** for implementation details

---

**Version 1.0** - Modern UI System
Last Updated: 2024
