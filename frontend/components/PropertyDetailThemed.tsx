/**
 * Property detail wrapper that applies builder theme styling
 * Wraps the detail panel and injects theme-aware CSS
 */

import { ReactNode } from 'react'
import { BuilderTheme } from '@/lib/builderTheme'

interface PropertyDetailThemedProps {
  theme?: BuilderTheme
  children: ReactNode
}

export default function PropertyDetailThemed({
  theme,
  children
}: PropertyDetailThemedProps) {
  if (!theme) return <>{children}</>

  const colors = theme.colors
  const fonts = theme.typography || { headline: 'sans-serif', body: 'sans-serif', label: 'sans-serif' }

  return (
    <>
      <style jsx>{`
        :root {
          --color-primary: ${colors.primary};
          --color-secondary: ${colors.secondary};
          --color-tertiary: ${colors.tertiary};
          --color-neutral: ${colors.neutral || '#ffffff'};
          --color-surface: ${colors.surface || '#ffffff'};
          --color-on-surface: ${colors['on-surface'] || '#000000'};
          --color-error: ${colors.error || '#dc2626'};
          --color-overlay: ${colors.overlay || '#000000cc'};
          --color-border: ${colors.border || '#e5e7eb'};
          --font-headline: "${fonts.headline}";
          --font-body: "${fonts.body}";
          --font-label: "${fonts.label}";
        }

        /* Apply theme to detail panel */
        .property-detail-panel {
          --accent: var(--color-primary);
          --accent-light: var(--color-secondary);
          --text-dark: var(--color-tertiary);
        }

        /* CTA buttons use theme primary */
        .property-cta-button {
          background-color: var(--color-primary);
          color: var(--color-neutral);
          border-color: var(--color-primary);
        }

        .property-cta-button:hover {
          background-color: var(--color-tertiary);
          border-color: var(--color-tertiary);
        }

        /* Section headers */
        .property-section-header {
          color: var(--color-tertiary);
          font-family: var(--font-headline);
        }

        /* Property info badges */
        .property-badge {
          background-color: var(--color-secondary);
          color: var(--color-on-surface);
          border: 1px solid var(--color-border);
        }

        /* Highlight accents */
        .property-accent {
          color: var(--color-primary);
        }

        /* Price display */
        .property-price {
          color: var(--color-primary);
          font-family: var(--font-headline);
          font-weight: 700;
        }

        /* Section divider */
        .property-divider {
          background-color: var(--color-border);
        }

        /* Dark overlay for hero */
        .property-hero-overlay {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--color-overlay) 80%, transparent),
            color-mix(in srgb, var(--color-tertiary) 40%, transparent)
          );
        }

        /* Amenity tags */
        .property-amenity-tag {
          background-color: transparent;
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
        }

        .property-amenity-tag.active {
          background-color: var(--color-primary);
          color: var(--color-neutral);
        }
      `}</style>

      {children}
    </>
  )
}
