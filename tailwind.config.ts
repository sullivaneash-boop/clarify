import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-inset': 'var(--surface-inset)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        paper: 'var(--paper)',
        'paper-text': 'var(--paper-text)',
        'paper-muted': 'var(--paper-muted)',
        'paper-border': 'var(--paper-border)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'accent-muted': 'var(--accent-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        panel: 'var(--shadow-panel)',
      },
      borderRadius: {
        button: '10px',
        panel: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config;
