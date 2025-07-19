# Layout System Documentation

## 📁 File Structure

```
src/
├── components/
│   ├── Layout.tsx       # Main layout wrapper
│   ├── Header.tsx       # Navigation header
│   └── Footer.tsx       # Site footer
├── pages/
│   └── HomePage.tsx     # Example page using layout
└── App.tsx             # Updated to use new layout
```

## 🏗️ Layout Architecture

### Layout.tsx
The main layout wrapper that provides the structure for all pages:
- **Gradient Background**: Matches your current theme (`from-primary-50 to-white`)
- **Flexible Structure**: Header, main content area, and footer
- **Theme Consistent**: Uses your established color palette

### Header.tsx
Responsive navigation header featuring:
- **Brand Logo**: Circular green logo with "O" 
- **Navigation Menu**: Desktop and mobile responsive
- **CTA Button**: "Get In Touch" with primary styling
- **Mobile Menu**: Collapsible hamburger menu
- **Sticky Position**: Remains at top while scrolling
- **Backdrop Blur**: Modern glass-morphism effect

### Footer.tsx
Comprehensive footer with:
- **Brand Section**: Logo and description
- **Quick Links**: Navigation links
- **Contact Info**: Email and information
- **Social Links**: Email icon (expandable)
- **Copyright**: With "Crafted by" attribution
- **Dark Theme**: Primary-800 background with proper contrast

## 🎨 Theme Integration

All components follow your established theme:
- **Primary Color**: #92c10c throughout
- **Typography**: Poppins for headings, Inter for body text
- **Color Variants**: Uses primary-50 through primary-800
- **Consistent Spacing**: Container-based responsive design
- **Glass Effects**: Backdrop blur and transparency

## 🚀 Usage Examples

### Basic Page Structure
```tsx
import Layout from '@/components/Layout';

const MyPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-4xl font-heading font-bold text-primary-800">
          Page Title
        </h1>
        <p className="text-muted-foreground">Page content...</p>
      </div>
    </Layout>
  );
};
```

### Page with Custom Spacing
```tsx
import Layout from '@/components/Layout';

const CustomPage: React.FC = () => {
  return (
    <Layout className="py-0"> {/* Remove default padding */}
      <div className="custom-content">
        {/* Your custom content */}
      </div>
    </Layout>
  );
};
```

## 📱 Responsive Features

### Header
- **Desktop**: Horizontal navigation with CTA button
- **Mobile**: Hamburger menu with slide-down navigation
- **Breakpoint**: Switches at `md` (768px)

### Footer
- **Desktop**: 4-column grid layout
- **Mobile**: Single column stack
- **Adaptive**: Content reflows naturally

### Layout
- **Container**: Responsive max-width with padding
- **Flex**: Uses flex-col for full-height layout
- **Sticky Footer**: Footer stays at bottom

## 🎯 Key Features

### Accessibility
- **Semantic HTML**: Proper header, main, footer structure
- **Focus States**: Keyboard navigation support
- **Screen Reader**: Hidden labels and proper ARIA
- **Color Contrast**: Meets accessibility standards

### Performance
- **Sticky Header**: Efficient positioning
- **Backdrop Blur**: Hardware-accelerated effects
- **Minimal Re-renders**: Optimized component structure

### Maintainability
- **Modular Design**: Separate components for easy updates
- **Theme Integration**: Uses CSS variables and Tailwind classes
- **TypeScript**: Full type safety
- **Consistent Patterns**: Reusable design patterns

## 🔧 Customization

### Adding New Pages
1. Create page component in `src/pages/`
2. Wrap content with `<Layout>`
3. Use theme classes for consistency

### Modifying Header
- Update navigation links in `Header.tsx`
- Add/remove menu items
- Customize CTA button

### Updating Footer
- Modify footer sections in `Footer.tsx`
- Add social media links
- Update contact information

### Router Integration
When adding React Router:
```tsx
// App.tsx with Router
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 🎨 Design Tokens Used

```css
/* Backgrounds */
bg-gradient-to-br from-primary-50 to-white  /* Main layout */
bg-white/95 backdrop-blur-sm                /* Header */
bg-primary-800                              /* Footer */

/* Colors */
text-primary-600          /* Links */
text-primary-800          /* Headings */
text-primary-200          /* Footer text */
border-primary-200        /* Borders */

/* Shadows */
shadow-lg shadow-primary-100/50  /* Card shadows */
```

The layout system is now ready for use with any routing system and provides a solid foundation for your OpenStay application! 🚀
