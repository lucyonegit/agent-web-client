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