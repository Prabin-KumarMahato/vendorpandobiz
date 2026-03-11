---
name: ui-ux-pro-max
description: Guidelines for building premium, modern, and highly-polished UI/UX components.
---

# UI/UX Pro Max Guidelines

This skill enforces high-end, modern design principles and exceptional user experiences. Whenever designing or implementing user interfaces, adhere to the following guidelines strictly.

## 🎨 1. Aesthetic Excellence (The "Pro Max" Feel)
*   **Color Palettes:** Avoid default/garish colors (no plain `red-500` or `blue-500` for primary elements). Use refined, custom, or nuanced color combinations (e.g., slate/zinc for dark mode, vibrant but subtle gradients for accents).
*   **Glassmorphism & Depth:** Utilize strategic blur (`backdrop-blur-md`, `bg-white/10`) and subtle shadows (`shadow-sm`, `shadow-md`, `shadow-xl`) to create depth and modern layers.
*   **Typography:** Maintain clear visual hierarchy. Use distinct font weights (e.g., `font-medium`, `font-semibold`) and tracking (`tracking-tight` for headings). 
*   **Spacing:** Ensure generous, consistent padding and margins (`p-6`, `gap-4`, `mb-8`). Avoid cluttered interfaces. Let elements breathe.
*   **Borders:** Use subtle, semi-transparent borders to separate elements rather than heavy lines (`border border-white/20`, `border-border/50`).

## ⚡ 2. Dynamic Interactions & Micro-animations
*   **Hover States:** Every interactive element (buttons, links, cards) must have a noticeable but smooth hover state (e.g., `hover:bg-accent`, `hover:-translate-y-1`, `hover:shadow-lg`).
*   **Transitions:** Always use smooth transitions for state changes (`transition-all duration-300 ease-in-out`, `transition-colors`). No abrupt changes.
*   **Active States:** Provide immediate feedback on click/press (`active:scale-95`).
*   **Loading States:** Implement sleek loading skeletons or highly visual spinners. Never let the UI freeze without feedback.

## 📱 3. Responsive & Adaptive Design
*   **Mobile-First Approach:** Always start with mobile styling and enhance for larger screens using Tailwind's breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
*   **Fluid Layouts:** Use Flexbox (`flex`) and CSS Grid (`grid`) exclusively for layout structuring. Avoid fixed widths and heights.
*   **Safe Areas:** Ensure content does not run against screen edges on mobile devices. Use structural containers (`container mx-auto px-4`).

## ♿ 4. Accessibility (A11y)
*   **Contrast:** Ensure text maintains clear contrast ratios against backgrounds, especially in dark mode.
*   **Keyboard Navigation:** All interactive elements must visibly show focus (`focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`).
*   **Aria Labels:** Provide descriptive `aria-label` tags and `title` attributes for elements relying solely on icons.
*   **Semantic HTML:** Use proper functional tags (`<button>`, `<a>`, `<nav>`, `<article>`) instead of generic `<div onClick={...}>`.

## 🛠️ 5. Implementation Standards (React + Tailwind)
*   **Component Composition:** Build small, reusable, perfectly polished micro-components (like custom buttons, inputs, and cards) instead of repeating long class sequences everywhere.
*   **CN Utility:** Always use a utility like `clsx` or `tailwind-merge` (typically named `cn`) to cleanly merge conditional Tailwind classes.

---
*Note: Any time you ask me to generate or edit a UI component, I will consult this file and automatically apply these "Pro Max" standards.*
