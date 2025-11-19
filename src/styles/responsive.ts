export const breakpoints = {
  mobile: 320,
  mobileLarge: 375,
  mobileXL: 414,
  tablet: 768,
  desktop: 1024,
  desktopLarge: 1440,
} as const;

export const mediaQueries = {
  mobile: `@media (max-width: ${breakpoints.tablet - 1}px)`,
  tablet: `@media (min-width: ${breakpoints.tablet}px) and (max-width: ${breakpoints.desktop - 1}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px) and (max-width: ${breakpoints.desktopLarge - 1}px)`,
  desktopLarge: `@media (min-width: ${breakpoints.desktopLarge}px)`,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const spacingPx = (key: keyof typeof spacing) => `${spacing[key]}px`;

export const typography = {
  caption: '12px',
  small: '14px',
  body: '16px',
  headingSm: 'clamp(18px, 4vw, 20px)',
  headingMd: 'clamp(20px, 5vw, 24px)',
  headingLg: 'clamp(24px, 6vw, 32px)',
  display: 'clamp(32px, 8vw, 48px)',
} as const;

export const touchTargets = {
  min: 44,
  recommended: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const layout = {
  containerPadding: 'clamp(16px, 4vw, 32px)',
  sectionGap: 'clamp(16px, 4vw, 24px)',
  cardPadding: 'clamp(16px, 4vw, 24px)',
} as const;

