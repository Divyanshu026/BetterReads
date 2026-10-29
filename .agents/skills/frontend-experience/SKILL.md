---
name: frontend-experience
description: Design and build usable, polished frontend experiences for websites, apps, games, and interactive tools. Use when a task involves creating or changing a user-facing interface.
---

# Frontend experience

Build the real experience for its audience and domain. Follow the application's existing design system and conventions when present; otherwise choose an appropriate visual style and interaction model for the task. Make common workflows easy to find and complete, and implement the expected states and views rather than a static mockup.

## Interface decisions

- Choose controls that match the action: tabs for views, menus for option sets, toggles or checkboxes for binary settings, and suitable numeric inputs for quantities. Use icons for familiar commands and provide tooltips for unfamiliar icon-only controls. Prefer the icon library already in the project; use Lucide when available and appropriate.
- Keep page sections in an unframed layout. Use cards for repeated items, dialogs, or tools that benefit from a frame; avoid nesting cards. Keep card corners compact (8px or less) unless the existing design system calls for something else.
- Make text, controls, and content fit without collisions at mobile and desktop sizes. Give fixed-format controls and tiles stable responsive dimensions. Use type sizes appropriate to each container; do not use viewport-scaled font sizes or negative letter spacing.
- Avoid explanatory in-product copy about how the interface works, its styling, or its keyboard shortcuts. Put text where it serves the user's task, such as labels, status, and help requested by the user.
- Avoid decorative gradient orbs and bokeh. Use a balanced palette rather than letting one hue family dominate.

## Match the product

- Operational products such as SaaS, CRM, and admin tools usually benefit from restrained styling, scannable information, predictable navigation, and efficient repeated actions. Games and expressive consumer experiences may call for more illustration, motion, and playfulness.
- When asked for a site, app, game, or tool, make the usable experience the first screen instead of defaulting to marketing content. Create a landing page only when the request calls for one.
- For a requested hero, use a subject-relevant image or immersive scene with text over it; keep the primary experience out of cards and avoid gradient or SVG-only hero artwork when real or generated imagery can carry the subject. For a branded or object-focused page, make the brand, product, place, or person visible in the first viewport, and leave a glimpse of the next section at common viewport sizes. Use a literal name or offer as the headline; place value propositions in supporting text.
- Websites and games should use relevant visual assets. Choose images that show the actual product, place, object, state, gameplay, or person when inspection matters; avoid imagery that is dark, blurred, or cropped so heavily that the subject is unclear. For bespoke game assets, SVG or 3D graphics may be the right choice.
- For domains with established rules, physics, parsing, or AI engines, prefer a proven library for core logic unless the user requests a from-scratch implementation.
- Use Three.js for 3D scenes. Make the primary scene immersive rather than a decorative card preview. When browser tooling is available, inspect desktop and mobile screenshots and confirm the scene renders and responds as intended.

## Run and present

When the implementation needs a development server, start it and share the local URL so the user can try it. If the preferred port is occupied, choose another available port. For a standalone HTML file that works when opened directly, provide a link to that file instead.
