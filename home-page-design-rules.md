# Shomer – Neo-Brutalist SaaS Landing Page Design Prompt

A vibrant Neo-Brutalist SaaS landing page utilizing a dominant **#FEFAFF** beige/white, deep purple **#9979FF**, and warm beige **#FAE8C7** accents. It features high-contrast dark purple borders, hard offset shadows, and bold geometric typography to convey professional confidence with a playful edge.

---

# Style

The style is a modern take on Neo-Brutalism. Typography pairs the high-impact **BC Alphapipe** for headings with **Quicksand** (weight 500–700) for body and UI readability. The palette uses **#FEFAFF** as a primary background, balanced by **#9979FF** purple and **#FAE8C7** warm beige. Visual elements are defined by **2px solid #3B1F8C** borders and **4px–8px hard shadows** (no blur). Micro-interactions involve `translate` effects on hover where buttons move 4px to 'fill' their shadow space.

## Spec

Create a design based on Neo-Brutalist principles.

**Colors:**
- Primary `#FEFAFF` (Beige/White)
- Brand `#9979FF` (Purple)
- Accent `#FAE8C7` (Warm Beige)
- UI `#ffffff` (White)
- Border/Shadow `#3B1F8C` (Dark Purple)

**Typography:**
- Headings: **BC Alphapipe** (Extrabold, tracking-tighter) — display and hero use only
- Body/UI: **Quicksand** (Medium, weight 500–600)

**UI Elements:**
- Use `2px solid #3B1F8C` borders on all cards, buttons, and sections
- Implement Hard Shadows using `box-shadow: 4px 4px 0px 0px #3B1F8C` for standard elements and `8px 8px 0px 0px #3B1F8C` for large containers
- Buttons should have a hover state that transforms: `translate(4px, 4px)` and removes the shadow to simulate a physical press
- Include a 32px × 32px radial dot pattern (opacity 8–10%) using `#9979FF` on primary beige/white backgrounds

---

# Layout & Structure

A vertically stacked landing page with high-contrast section transitions. It moves from a high-energy beige/white hero to a dark purple social proof bar, followed by white/beige feature grids and a dark-mode 'how it works' flow.

## Navigation

Fixed header at `top-0`, `h-20`, background `#FEFAFF`, `border-b-2` `border-#3B1F8C`. Left: Logo with the Shomer shepherd crook icon. Center: Horizontal links in bold Quicksand. Right: 'Start Free Trial' button (Dark purple `#3B1F8C` background, `#FAE8C7` text, 2px border, hard shadow).

## Hero Section

Two-column grid on `#FEFAFF` background with radial dot pattern. Left column: Badge 'NEW: AI Health Assistant 2.0' (White, pill-shaped, 2px border). Heading: **BC Alphapipe** 8xl, `#3B1F8C`, with one keyword using `-webkit-text-stroke: 2px #3B1F8C` and transparent fill. CTA group: Primary dark purple button with 8px hard shadow, secondary white button with 4px hard shadow. Right column: Browser mockup (White, 2px border, 12px hard shadow) showing a dashboard with metric cards and `#FAE8C7` accent panels.

## Social Proof Marquee

Full-width bar, background `#9979FF`, `border-b-2` `border-#3B1F8C`. Contains a continuous horizontal marquee of brand names in **BC Alphapipe**, color `#FAE8C7`, 50% opacity, moving infinitely at a slow linear pace.

## Problem vs Solution

White background section. Two large 3xl-rounded cards side-by-side. Card A (Problem): `#f4f4f5`, 2px dashed gray border, 70% opacity. Card B (Solution): `#FEFAFF`, 2px solid `#3B1F8C` border, 8px hard shadow. Both cards use bold lists with custom check/x icons.

## Feature Grid

Background `#FEFAFF`, `border-y-2` `border-#3B1F8C`. 3-column grid of white cards. Each card: 2px border, 4px hard shadow. Top of card features a 16×16 icon box in `#FAE8C7` that turns `#9979FF` on hover. Headings are **BC Alphapipe** 2xl.

## How It Works

Dark mode section (Background `#9979FF`). 3-step horizontal flow. Steps are marked by large 24×24 circles with 4px colored 'glow' borders (Warm Beige, White, Dark Purple). Steps are connected by a dark `#7B5FD4` horizontal line.

## Use Case Personas

White background. 3-column bento-style grid. Card 1: Warm Beige (`#FAE8C7`). Card 2: Purple (`#9979FF`) with 8px hard shadow. Card 3: Dark Purple (`#3B1F8C`) with white text. Each card features a white 'pill' badge at the top indicating the user type.

## Testimonials

Background `#FAE8C7`. Grid of 3 white cards. Unique styling: Cards have asymmetric corner rounding (Top-Right and Bottom-Left are 3xl, Top-Left and Bottom-Right are 2px). Includes a 5-star rating in `#9979FF`.

## Final CTA & Footer

Final CTA on `#FEFAFF` with large centered **BC Alphapipe** heading. Footer in `#9979FF` with 4 columns. Social icons are 10×10 squares (`#7B5FD4`) with light purple borders that turn `#FAE8C7`/Dark on hover.

---

# Special Components

## Neo-Brutalist Push Button

A high-contrast button that visually 'depresses' when hovered or clicked.

```css
background-color: #3B1F8C;
color: #FAE8C7;
padding: 1rem 2rem;
border: 2px solid #3B1F8C;
border-radius: 0.75rem;
box-shadow: 8px 8px 0px 0px #3B1F8C;
transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* On Hover */
transform: translate(4px, 4px);
box-shadow: 4px 4px 0px 0px #3B1F8C;
```

## Browser Mockup Dashboard

A stylized application UI container for marketing visuals.

Background white, border `2px solid #3B1F8C`, border-radius `1rem`, shadow `12px 12px 0px #3B1F8C`. Header bar: background `#3B1F8C`, contains three small colored circles (Red `#FF6B6B`, Beige `#FAE8C7`, Purple `#9979FF`). Content area uses a grid layout with `#FAE8C7` and `#9979FF` internal cards.

---

# Special Notes

- **MUST:** Maintain a strict `2px` border-width on all interactive elements
- **MUST:** Use only hex values `#FEFAFF`, `#9979FF`, and `#FAE8C7` for branded sections
- **MUST:** Ensure all shadows have `0` blur radius
- **MUST:** Use **BC Alphapipe** only for headings, hero text, and key brand moments — never body copy
- **MUST:** Use **Quicksand** for all UI, body text, captions, and functional communication
- **DO NOT:** Use gradients or soft shadows
- **DO NOT:** Use rounded corners on buttons larger than 12px; keep the aesthetic geometric
- **DO NOT:** Apply any colors outside the approved Shomer palette

---

# Color Mapping Reference

| Original Prompt | Shomer Equivalent | Role |
|---|---|---|
| `#ffe17c` Yellow | `#FEFAFF` Beige/White | Primary background |
| `#171e19` Charcoal | `#9979FF` Purple | Dark sections, marquee |
| `#b7c6c2` Sage | `#FAE8C7` Warm Beige | Accents |
| `#000000` Black | `#3B1F8C` Dark Purple | Borders & shadows |
| Cabinet Grotesk | BC Alphapipe | Display/headings |
| Satoshi | Quicksand | Body/UI |
