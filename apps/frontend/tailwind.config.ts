import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/**
 * BharatAssist AI — "Public Registry" design system.
 *
 * The product is a register of official government notifications, so the
 * palette is built from the artefacts of that world: sanction green (an
 * approved order), indigo (a state seal), vermilion (a stamped deadline),
 * on paper. Colour carries meaning here — `central` and `state` are the
 * spine colours that tell a citizen which government issued a scheme.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1360px' }
    },
    extend: {
      colors: {
        // shadcn-compatible aliases, driven by the CSS variables in index.css
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },

        // The registry palette, addressed directly.
        paper: '#F4F5F3',
        surface: '#FFFFFF',
        'surface-sunk': '#FAFAF8',

        ink: {
          DEFAULT: '#16191C',
          2: '#545B62',
          3: '#868D94',
          4: '#A8AEB3'
        },

        rule: {
          DEFAULT: '#E3E5E1',
          strong: '#CDD0CA',
          soft: '#EEEFEC'
        },

        // Primary — the colour of a sanctioned order.
        sanction: {
          DEFAULT: '#0E6B4E',
          hover: '#0B5A41',
          deep: '#083E2D',
          tint: '#E8F1ED',
          edge: '#C3DBD1'
        },

        // Level spines: who issued the scheme.
        central: '#0E6B4E',
        state: '#2E4374',

        indigo: {
          DEFAULT: '#2E4374',
          tint: '#EAEDF4',
          edge: '#C7CEDF'
        },

        // Vermilion — a stamp. Deadlines, closures, destructive actions only.
        seal: {
          DEFAULT: '#AE3520',
          tint: '#FAEDEA',
          edge: '#E8C6BE'
        },

        // Amber — "closing soon", stale records.
        ochre: {
          DEFAULT: '#8A5A08',
          tint: '#FBF2E2',
          edge: '#E7D3AC'
        }
      },

      fontFamily: {
        display: ['Inter', '"Noto Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', '"Noto Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },

      fontSize: {
        // Utility scale for the mono provenance/label register.
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em' }],
        label: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.04em' }]
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },

      boxShadow: {
        hairline: '0 0 0 1px rgba(22, 25, 28, 0.07)',
        card: '0 1px 2px rgba(22, 25, 28, 0.05), 0 0 0 1px rgba(22, 25, 28, 0.05)',
        lift: '0 6px 20px -8px rgba(22, 25, 28, 0.18), 0 0 0 1px rgba(22, 25, 28, 0.06)',
        pop: '0 16px 40px -12px rgba(22, 25, 28, 0.24), 0 0 0 1px rgba(22, 25, 28, 0.07)',
        focus: '0 0 0 3px rgba(14, 107, 78, 0.18)'
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.06)' },
          '60%': { opacity: '1', transform: 'scale(0.99)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        'caret-blink': {
          '0%, 70%, 100%': { opacity: '1' },
          '20%, 50%': { opacity: '0' }
        }
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'rise-in': 'rise-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'stamp-in': 'stamp-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'caret-blink': 'caret-blink 1.2s steps(1) infinite'
      }
    }
  },
  plugins: [tailwindcssAnimate]
} satisfies Config;
