---
name: shomer-design-system
description: Governs all UI design decisions for the Shomer veterinary web app. Covers brand colors, typography (BC Alphapipe + Quicksand), button styles, spacing, surface layering, and dark/light mode tokens. Use when creating or modifying any frontend component, page, layout, or styling in Shomer.
---

# Shomer – Web App Design System

For the receptionist and vet console. Clean, legible, distraction-free. Built for daily use.

> **Reference:** Notion's content-first layout — generous whitespace, clear hierarchy, nothing decorative that doesn't earn its place.

---

## Guiding Principle

This is a work surface, not a marketing page. Every design decision should reduce cognitive load for someone using this app for 6–8 hours a day. If an element doesn't help the user do their job faster, remove it.

---

## Colors

Same Shomer palette — used differently than the landing page.

| Token | Hex | Role in the app |
|---|---|---|
| `--bg` | `#FEFAFF` | Page background |
| `--surface` | `#F4F0FA` | Sidebar, top bar, card backgrounds |
| `--surface-2` | `#EDE8F5` | Active/selected row, hover states, input focus rings |
| `--border` | `rgba(26,24,37,0.08)` | Dividers, card edges — light and unobtrusive |
| `--border-active` | `rgba(153,121,255,0.4)` | Focus rings, selected state borders |
| `--primary` | `#9979FF` | Active nav, primary CTA button, selected state text, focus indicators |
| `--accent` | `#FAE8C7` | Badges, tags, warm highlights — used sparingly |
| `--text` | `#1A1825` | All primary text |
| `--muted` | `#6B6478` | Labels, secondary text, placeholders, empty states |
| `--danger` | `#E05555` | Emergency badges, destructive actions, error states |
| `--success` | `#16A34A` | Completed status |
| `--warning` | `#D97706` | In-progress status |
| `--white` | `#ffffff` | Input backgrounds, table rows on hover |

### Rules

- `#9979FF` is used **only** for interactive states — active nav, primary button, selected row text, focus border. Never as a fill or background.
- `#FAE8C7` is for small badges and tags only. Never for large surfaces.
- `#3B1F8C` (dark purple from landing page) is **not used** in the app. It belongs to the marketing surface.
- No gradients. No decorative fills.

---

## Typography

Same fonts as the landing page. Different application.

| Font | Usage |
|---|---|
| **BC Alphapipe** | Page titles only (e.g. "Dr. Priya's Queue"). One per page maximum. |
| **Quicksand** | Everything else — nav, labels, body, inputs, buttons, tables |

### Scale

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 20px | 700 | BC Alphapipe |
| Section header | 13px | 700 | Quicksand, uppercase, `0.06em` letter-spacing |
| Body / table rows | 13px | 500 | Quicksand |
| Labels / overlines | 11px | 600 | Quicksand, uppercase, `0.06em` letter-spacing |
| Captions / timestamps | 11–12px | 500 | Quicksand, muted color |

### Rules

- BC Alphapipe appears once per page, at the top. Nowhere else.
- Never use BC Alphapipe for labels, buttons, or table content.
- Overlines (section labels above content groups) are always 11px, uppercase, `--muted` color, `0.06em` letter-spacing.

---

## Buttons

| Variant | When to use | Background | Text | Border |
|---|---|---|---|---|
| Primary | Single most important action on the page | `#9979FF` | white | none |
| Secondary | Secondary actions alongside a primary | transparent | `#9979FF` | `1px solid #9979FF` |
| Ghost | Tertiary actions, filters, back buttons | transparent | `--muted` | `1px solid --border` |
| Danger | Destructive actions only | `#E05555` | white | none |

### Rules

- `border-radius: 4px` on all buttons. No more.
- One primary button per view. Never two.
- No hover animations or translate effects — just `opacity: 0.85` on hover is enough.
- Padding: `8px 16px` standard. `6px 12px` for compact (inline table actions).

---

## Layout

### App Shell

```
[ 52px icon rail ] [ 210px sidebar ] [ flex-1 main content ]
```

- **Icon rail** — logo mark + navigation icons. Background: `--surface`. Right border: `1px solid --border`.
- **Sidebar** — context for the current section (daily stats, doctor list, filters). Background: `--surface`. Right border: `1px solid --border`.
- **Main content** — the actual work area. Background: `--bg`. Full height, scrollable.

### Top Bar (inside main content)

- Height: 52px. Background: `--surface`. Bottom border: `1px solid --border`.
- Left: page title (BC Alphapipe, 14–16px). Secondary descriptor in muted text inline.
- Right: action buttons (ghost + primary only).

### Content Area

- Padding: `16px 24px`.
- No decorative section blocks. Let whitespace do the work.

---

## Surfaces and Elevation

Elevation is expressed through **background stepping only**. No shadows.

```
Page background:  #FEFAFF  (--bg)
Sidebar / bars:   #F4F0FA  (--surface)
Active rows:      #EDE8F5  (--surface-2)
Cards / inputs:   #ffffff  (--white)
```

Never use `box-shadow` as a primary elevation signal. If something needs to stand above the page, step its background one level.

---

## Navigation

### Icon Rail

- 52px wide.
- Each nav icon: 36×36px, `border-radius: 4px`.
- Active state: background `--surface-2`, border `1px solid --border-active`, icon color `--primary`.
- Inactive state: no background, icon color `--muted`.
- Transition: `all 150ms ease`.

### Sidebar

- Groups content with an overline label (11px, uppercase, `--muted`).
- Active item: background `--surface-2`, border `1px solid --border-active`, text `--primary`.
- Inactive item: no background, text `--muted`.

---

## Tables / Queue Lists

The primary content pattern in this app is a row-based list (the queue). Treat it like a Notion database table.

- Column headers: 10px, uppercase, `0.08em` letter-spacing, `--muted`. No background — just a bottom padding separator.
- Rows: `padding: 10px 12px`. `border-radius: 4px`. No border by default.
- Row hover: background `--surface`.
- Row active/selected: background `--surface-2`, border `1px solid --border-active`.
- Row completed / disabled: `opacity: 0.5`. Not clickable.
- Token number: `--muted` when inactive, `--primary` when in-progress.

---

## Form Inputs

- Background: `#ffffff`.
- Border: `1px solid --border`.
- Border on focus: `1px solid --primary`.
- `border-radius: 4px`.
- Padding: `9px 12px`.
- Font: Quicksand 13px, `--text`.
- No shadow. No custom focus ring beyond the border color change.
- Labels above inputs: 11px, uppercase, `--muted`, `0.06em` letter-spacing.

---

## Badges and Tags

Used for: Emergency, New Patient, visit status.

- `font-size: 10px`, `font-weight: 700`, uppercase, `0.05em` letter-spacing.
- `border-radius: 3px`. Compact padding: `2px 6px`.
- Color + `15%` alpha background + `30%` alpha border. Always derived from a single color token (danger, primary, success, etc.).
- Never use `#FAE8C7` as a badge background with dark text — it reads as decorative, not functional.

---

## Status Indicators

Dot + label pattern for queue status.

| Status | Dot color | Label color |
|---|---|---|
| Waiting | `--muted` | `--muted` |
| In Progress | `--warning` (#D97706) | `--warning` |
| Completed | `--success` (#16A34A) | `--success` |
| Emergency | `--danger` | `--danger` |

Dot size: 6×6px, `border-radius: 50%`. Always paired with a text label — never dot alone.

---

## Tabs

Used for switching between consultation panels (Consultation / Visit History / Pet Profile).

- Underline style only. No pill tabs, no box tabs.
- Active: `2px solid --primary` bottom border, text `--primary`.
- Inactive: `2px solid transparent` bottom border, text `--muted`.
- Font: Quicksand 13px, weight 600.
- No background change on active tab.

---

## Empty States

When a panel or section has no content:

- Centered vertically and horizontally in the available space.
- A single contextual emoji (🐾, 🩺, etc.) at 28–32px.
- One line of muted text: 13px, `--muted`, Quicksand 600.
- No illustrations, no decorative boxes.

---

## Toast / Confirmation

For non-blocking feedback (e.g. "Consultation complete — sent to receptionist").

- Fixed bottom-center. `padding: 10px 18px`.
- Background: `--text` (#1A1825). Text: `--bg` (#FEFAFF). `border-radius: 4px`.
- Font: Quicksand 13px, weight 600.
- Auto-dismiss after 3 seconds. No close button needed.
- One toast at a time.

---

## What Is NOT in This System

These elements belong to the landing page. Do not bring them into the app.

- Hard offset shadows (`box-shadow: 4px 4px 0 #3B1F8C`)
- 2px dark purple borders on every element
- Dot pattern backgrounds
- Translate hover animations on buttons
- High-contrast section transitions
- The dark purple `#3B1F8C` as a surface color
- BC Alphapipe in body copy, buttons, or labels
- The Social Proof Marquee aesthetic