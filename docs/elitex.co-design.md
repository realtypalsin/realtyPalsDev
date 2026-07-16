---
version: alpha
name: Elite-X Prestige
description: A cinematic luxury real-estate system with editorial typography, warm champagne accents, and a dark immersive hero treatment.
colors:
  primary: "#c47860"
  secondary: "#f2e8d8"
  tertiary: "#171412"
  neutral: "#ffffff"
  surface: "#ffffff"
  on-surface: "#000000"
  error: "#b33a3a"
  overlay: "#000000cc"
  border: "#c4786033"
typography:
  headline-display:
    fontFamily: Cinzel
    fontSize: 85px
    fontWeight: 700
    lineHeight: 102px
    letterSpacing: 5.103px
  headline-lg:
    fontFamily: Cinzel
    fontSize: 58px
    fontWeight: 700
    lineHeight: 70px
    letterSpacing: 0px
  headline-md:
    fontFamily: Cinzel
    fontSize: 40px
    fontWeight: 600
    lineHeight: 48px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Josefin Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 34px
    letterSpacing: 0px
  body-lg:
    fontFamily: Cormorant Garamond
    fontSize: 19px
    fontWeight: 400
    lineHeight: 31px
    letterSpacing: 0px
  body-md:
    fontFamily: Cormorant Garamond
    fontSize: 18px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: 0px
  body-sm:
    fontFamily: Cormorant Garamond
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  label-lg:
    fontFamily: Josefin Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: 0.12em
  label-md:
    fontFamily: Josefin Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Josefin Sans
    fontSize: 12px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: 0.1em
  caption:
    fontFamily: Josefin Sans
    fontSize: 11px
    fontWeight: 400
    lineHeight: 13px
    letterSpacing: 0.14em
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 24px
  lg: 36px
  xl: 44px
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "15px 22px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.none}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "15px 22px"
    height: "44px"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.sm}"
    padding: "20px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.none}"
    padding: "15px 22px"
  chip:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
---

# Elite-X Prestige

## Overview
Elite-X feels like a premium residential brochure translated into a cinematic landing page. The tone is luxurious, formal, and slightly dramatic, with strong contrast, elegant serif headlines, and restrained warm accents that keep the experience aspirational rather than flashy. The UI should feel spacious and editorial, with careful use of negative space and minimal chrome so the architecture photography remains the focus.

## Colors
- **Primary (#c47860):** A warm terracotta-copper accent used for calls to action, highlight text, active indicators, and small emphasis details. It reads as refined rather than playful.
- **Secondary (#f2e8d8):** A champagne-beige tint used for prominent button fills, light text on dark photography overlays, and subtle luxury accents.
- **Tertiary (#171412):** A near-black espresso tone used for deep overlays, dark frames, and grounding elements behind imagery.
- **Neutral / Surface (#ffffff):** Clean white reserved for cards, structural panels, and maximal legibility when content sits away from the hero image.
- **On-surface (#000000):** Pure black for strongest text contrast when the design sits on light backgrounds.
- **Border (#c4786033):** A translucent copper border color for delicate rules, button strokes, and understated dividers.
- **Overlay (#000000cc):** A high-opacity black overlay used to preserve readability over photography and create the moody hero atmosphere.
- **Error (#b33a3a):** A muted red reserved for validation and destructive states; it should stay secondary to the brand palette.

## Typography
Headlines are set in Cinzel, giving the brand an upscale, classical, architectural voice. The largest headings are dramatic and wide-spaced, especially the hero title, which uses heavy weight and generous tracking to feel monumental. Josefin Sans handles navigation, labels, and utility copy with an elegant geometric rhythm, while Cormorant Garamond provides the body text with an editorial, high-end magazine quality.

Use the display scale for hero mastheads and key section titles, the medium headline scale for supporting section headers, and the body styles for descriptive prose and property information. Labels and navigation should stay in uppercase or small-caps-like treatment with increased letter spacing, matching the source’s refined, spaced-out navigation and metadata. Avoid dense paragraph blocks; the typography wants air and measured cadence.

## Layout & Spacing
The layout is driven by a full-bleed hero image with content layered on top, rather than a boxed, conventional grid. Navigation and hero copy sit in a wide horizontal band across the top-left and center, while the primary CTA is isolated at the top-right for immediate visibility. Content spacing is generous and theatrical, using the 8px, 16px, 24px, 36px, and 44px rhythm to separate metadata, title, subtitle, and KPI blocks.

Sections should favor fixed-max-width content over edge-to-edge text once below the hero, but the brand can continue to use wide imagery and open spacing. Padding should feel luxurious: enough room for breathing space, but not so much that the page loses its sense of scale. Cards and panels should use modest internal padding and align to a clean vertical rhythm.

## Elevation & Depth
Depth is created mostly through contrast, overlays, and photography rather than through strong shadows. The hero relies on a dark gradient wash to keep text readable over the building render, and the UI uses subtle borders with minimal shadow treatment. Where shadows appear, they should be soft and atmospheric, never glossy or material-heavy.

The system should feel layered, with the image as the deepest plane, a dark overlay above it, and typography/controls sitting cleanly on top. Flat surfaces are acceptable for cards and inputs because the brand leans more toward architectural precision than skeuomorphic depth. Borders and tonal separation are preferred over raised elevation.

## Shapes
The shape language is highly restrained and mostly rectilinear. Most interactive elements use square corners or near-square treatment, reinforcing the architectural and premium tone. If rounding is used, it should be extremely subtle, like `rounded.sm` or `rounded.md`, and reserved for small utility components rather than hero actions.

Pills and circular affordances may appear only for floating tools such as chat or scroll indicators. Overall, the geometry should feel sharp, exact, and composed.

## Components
Buttons should be compact, uppercase, and composed. The primary CTA uses the warm champagne fill from `button-primary` with dark text, while secondary actions should remain transparent or lightly outlined via `button-secondary`. Hover states may shift toward the copper `primary` tone for emphasis, but motion and color changes should stay understated. Padding should remain close to `15px 22px`, with a minimum touch height around `44px`.

Cards use a white surface, delicate border, and minimal or no shadow, matching `card`. They should not feel elevated like app tiles; instead, they should act as quiet information containers. Use conservative padding and avoid heavy decoration.

Inputs should be slim, transparent, and typographically aligned with the label system. Borders should stay subtle and corners should remain square. Focus states can use the copper accent, but avoid bright glows or thick underlines.

Labels, navigation items, and metadata should use the Josefin Sans label styles with increased tracking. This is especially important for section eyelines, top navigation, and small KPI captions. Chips, tags, and status pills should be small, refined, and minimally rounded only when needed.

Floating utility elements such as chat triggers, scroll hints, and pagination indicators should remain simple and highly legible. Keep them visually lightweight so they do not compete with the hero image or the primary CTA.

## Do's and Don'ts
- Do keep the page cinematic, with photography and overlays taking visual priority over container-heavy UI.
- Do use Cinzel for major headlines and Josefin Sans for navigation, labels, and small UI text.
- Do maintain generous spacing and deliberate alignment; the design should feel curated, not crowded.
- Do use warm copper and champagne accents sparingly to signal premium emphasis.
- Don't introduce bright, saturated brand colors that break the luxury mood.
- Don't rely on heavy shadows, soft gradients, or rounded app-style widgets as the main visual language.
- Don't set body text in the headline serif; reserve Cormorant Garamond for descriptive prose.
- Don't overuse decorative borders or motion that distracts from the architectural imagery.