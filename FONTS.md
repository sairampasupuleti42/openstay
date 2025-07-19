# Font Configuration Guide

## 📁 Font Structure

```
src/
├── assets/
│   └── fonts/
│       ├── fonts.css         # Font face declarations
│       ├── Inter-Regular.woff2
│       ├── Inter-Medium.woff2
│       ├── Inter-SemiBold.woff2
│       ├── Inter-Bold.woff2
│       ├── Poppins-Regular.woff2
│       ├── Poppins-Medium.woff2
│       ├── Poppins-SemiBold.woff2
│       └── Poppins-Bold.woff2
```

## 🎨 Font Families Configured

### Primary Font: Inter
- **Usage**: Body text, paragraphs, general content
- **Class**: `font-sans` (default)
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### Heading Font: Poppins
- **Usage**: Headings, titles, important text
- **Class**: `font-heading`
- **Weights**: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)

### Monospace Font: System Default
- **Usage**: Code, monospaced content
- **Class**: `font-mono`

## 🔧 How to Add Your Own Fonts

1. **Download Font Files**
   - Get `.woff2`, `.woff`, and `.ttf` formats for best browser support
   - Place them in `src/assets/fonts/`

2. **Update fonts.css**
   ```css
   @font-face {
     font-family: 'YourFont';
     src: url('./YourFont-Regular.woff2') format('woff2'),
          url('./YourFont-Regular.woff') format('woff'),
          url('./YourFont-Regular.ttf') format('truetype');
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   ```

3. **Update tailwind.config.js**
   ```js
   fontFamily: {
     custom: ['YourFont', 'fallback-font', 'sans-serif'],
   }
   ```

4. **Use in Components**
   ```jsx
   <h1 className="font-custom">Your Custom Font Text</h1>
   ```

## 🎯 Usage Examples

```jsx
// Heading with Poppins font
<h1 className="font-heading text-4xl font-bold">Main Title</h1>

// Body text with Inter font (default)
<p className="font-sans text-lg">Body content</p>

// Explicit font usage
<span className="font-heading font-semibold">Important Text</span>
```

## 🚀 Font Loading Optimization

- **font-display: swap** - Shows fallback font while custom font loads
- **Preload Critical Fonts** - Add to index.html for faster loading:
  ```html
  <link rel="preload" href="/src/assets/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
  ```

## 📱 Font Performance Tips

1. **Use WOFF2 format** - Best compression and browser support
2. **Limit font weights** - Only load what you actually use
3. **Use font-display: swap** - Better perceived performance
4. **Consider variable fonts** - Single file for multiple weights

## 🎨 Current Font Classes Available

- `font-sans` - Inter (body text)
- `font-heading` - Poppins (headings)
- `font-mono` - System monospace
- `font-light` - Weight 300
- `font-normal` - Weight 400
- `font-medium` - Weight 500
- `font-semibold` - Weight 600
- `font-bold` - Weight 700
