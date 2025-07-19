# OpenStay Theme Guide

## 🎨 Primary Color: #92c10c

### Color Palette

```css
/* Primary Green (#92c10c) */
--primary-50: #f7fcf0    /* Very light green background */
--primary-100: #ecf7dc   /* Light green background */
--primary-200: #ddefbc   /* Subtle green tint */
--primary-300: #c5e291   /* Light green accent */
--primary-400: #acd366   /* Medium light green */
--primary-500: #92c10c   /* Main primary color */
--primary-600: #7ba009   /* Darker primary */
--primary-700: #627d07   /* Dark green */
--primary-800: #4f640a   /* Very dark green */
--primary-900: #43540c   /* Darkest green */
```

## 🌈 Theme Usage

### Background Colors
- `bg-primary-50` - Very subtle green tint for page backgrounds
- `bg-primary-100` - Light green for card backgrounds
- `bg-primary-500` - Main brand color for buttons, highlights
- `bg-gradient-to-br from-primary-50 to-white` - Gradient backgrounds

### Text Colors
- `text-primary` - Main brand color for links and highlights
- `text-primary-600` - Darker variant for hover states
- `text-primary-800` - Dark green for headings on light backgrounds
- `text-white` - White text on primary backgrounds

### Border & Accent Colors
- `border-primary-200` - Subtle green borders
- `decoration-primary-300` - Light underline decorations
- `shadow-primary-100/50` - Subtle green shadows

## 🎯 Component Examples

### Buttons
```jsx
// Primary button
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Primary Action
</button>

// Secondary button
<button className="bg-primary-100 hover:bg-primary-200 text-primary-800">
  Secondary Action
</button>

// Outline button
<button className="border-2 border-primary-500 text-primary-600 hover:bg-primary-50">
  Outline Button
</button>
```

### Cards
```jsx
// Light card with green accent
<div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
  <h3 className="text-primary-800">Card Title</h3>
  <p className="text-primary-600">Card content</p>
</div>

// White card with green shadow
<div className="bg-white shadow-lg shadow-primary-100/50 rounded-lg p-6">
  Content with green shadow
</div>
```

### Typography
```jsx
// Gradient heading
<h1 className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
  Gradient Heading
</h1>

// Primary colored text
<p className="text-primary-600">Important text</p>
```

### Links
```jsx
<a className="text-primary hover:text-primary-600 underline decoration-primary-300">
  Styled Link
</a>
```

## 🌙 Dark Mode Support

The theme automatically adapts for dark mode with adjusted contrast and brightness for optimal readability.

## 🚀 Brand Guidelines

- **Primary**: Use #92c10c for main actions, highlights, and brand elements
- **Backgrounds**: Use primary-50 to primary-200 for subtle backgrounds
- **Text**: Use primary-600 to primary-800 for readable text on light backgrounds
- **Accents**: Use primary-300 to primary-400 for decorative elements

## 🎨 CSS Variables

The theme uses CSS custom properties that can be easily customized:

```css
:root {
  --primary: 81 66% 41%;  /* HSL values for #92c10c */
  --primary-foreground: 0 0% 100%;  /* White text on primary */
}
```

## 🔧 Customization

To change the primary color:
1. Update the CSS variables in `src/index.css`
2. Update the color palette in `tailwind.config.js`
3. The theme will automatically adapt across all components
