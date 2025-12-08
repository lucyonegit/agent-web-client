// Manus 风格主题
export const theme = {
  color: {
    bg: '#fafbfc',
    bgSecondary: '#f5f7fa',
    card: '#ffffff',
    text: '#1a1f36',
    subtext: '#697386',
    muted: '#9ca3af',
    border: '#e4e7eb',
    borderLight: '#f0f1f3',
    primary: '#5b7fff',
    primaryLight: '#eef2ff',
    primaryDark: '#4c6bff',
    success: '#10b981',
    successLight: '#d1fae5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#dbeafe'
  },
  radius: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  },
  shadow: {
    xs: '0 1px 2px rgba(26, 31, 54, 0.04)',
    sm: '0 1px 3px rgba(26, 31, 54, 0.05), 0 1px 2px rgba(26, 31, 54, 0.06)',
    md: '0 4px 6px -1px rgba(26, 31, 54, 0.08), 0 2px 4px -1px rgba(26, 31, 54, 0.06)',
    lg: '0 10px 15px -3px rgba(26, 31, 54, 0.1), 0 4px 6px -2px rgba(26, 31, 54, 0.05)',
    xl: '0 20px 25px -5px rgba(26, 31, 54, 0.1), 0 10px 10px -5px rgba(26, 31, 54, 0.04)'
  },
  space: (n: number) => `${n * 4}px`,
  font: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
  },
  transition: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease'
  }
};

export const darkTheme = {
  color: {
    bg: '#0b0f14',
    bgSecondary: '#111827',
    card: '#0f1622',
    text: '#e6e8f0',
    subtext: '#9aa3b2',
    muted: '#728195',
    border: '#1f2a37',
    borderLight: '#1a2330',
    primary: '#7c3aed',
    primaryLight: 'rgba(124,58,237,0.12)',
    primaryDark: '#5b21b6',
    success: '#10b981',
    successLight: 'rgba(16,185,129,0.15)',
    danger: '#ef4444',
    dangerLight: 'rgba(239,68,68,0.15)',
    warning: '#f59e0b',
    warningLight: 'rgba(245,158,11,0.15)',
    info: '#3b82f6',
    infoLight: 'rgba(59,130,246,0.15)'
  },
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999
  },
  shadow: {
    xs: '0 1px 2px rgba(0,0,0,0.35)',
    sm: '0 6px 12px rgba(0,0,0,0.35)',
    md: '0 10px 20px rgba(0,0,0,0.35)',
    lg: '0 16px 32px rgba(0,0,0,0.35)',
    xl: '0 24px 48px rgba(0,0,0,0.35)'
  },
  space: (n: number) => `${n * 4}px`,
  font: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
  },
  transition: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease'
  }
};
