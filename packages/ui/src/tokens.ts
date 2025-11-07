export const tokens = {
  color: {
    background: {
      page: '#05060A',
      surface: '#11141D',
      elevated: '#191E2A'
    },
    text: {
      primary: '#F4F6FF',
      secondary: '#B3BDD6',
      muted: '#8792B0'
    },
    border: '#272D3A',
    brand: '#7C5CFF',
    success: '#2ECC71',
    danger: '#FF6B6B'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18
  },
  typography: {
    fontFamily: 'System',
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 28
    }
  },
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 8
    }
  }
} as const;

export type Tokens = typeof tokens;
