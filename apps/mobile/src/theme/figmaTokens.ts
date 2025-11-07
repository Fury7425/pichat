const tokens = {
  color: {
    bg: {
      page: '#0B0C0F',
      surface: '#12141A'
    },
    text: {
      primary: '#E6E8F0',
      secondary: '#A7B0C0'
    },
    brand: {
      primary: '#7C5CFF'
    },
    border: {
      muted: '#2A2F3A'
    }
  },
  typography: {
    fontFamily: 'Inter',
    sizes: [28, 20, 16, 14, 12]
  },
  spacing: [0, 4, 8, 12, 16, 20, 24, 28, 32],
  radii: [8, 12, 16, 24]
} as const;

export default tokens;
