// Touch target utilities for mobile accessibility
// WCAG 2.2 requires minimum 44x44px touch targets

import { touchTargets } from '../styles/responsive';

export const touchTargetStyle = {
  minWidth: `${touchTargets.min}px`,
  minHeight: `${touchTargets.min}px`,
  // Ensure padding provides adequate space even with small content
  padding: '12px 16px',
} as const;

// For icon-only buttons (like dark mode toggle)
export const iconButtonStyle = {
  minWidth: `${touchTargets.min}px`,
  minHeight: `${touchTargets.min}px`,
  padding: '10px', // Square padding for icon buttons
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

// For compact buttons (like badges, tags)
export const compactButtonStyle = {
  minWidth: `${touchTargets.min}px`,
  minHeight: `${touchTargets.min}px`,
  padding: '8px 12px', // Minimum padding that still meets 44px
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

// Helper to merge with existing styles
export const ensureTouchTarget = (
  existingStyle: React.CSSProperties,
  variant: 'default' | 'icon' | 'compact' = 'default'
): React.CSSProperties => {
  const baseStyle = variant === 'icon' 
    ? iconButtonStyle 
    : variant === 'compact' 
      ? compactButtonStyle 
      : touchTargetStyle;
  
  return {
    ...existingStyle,
    ...baseStyle,
    // Preserve existing padding if it's larger
    padding: existingStyle.padding || baseStyle.padding,
    minWidth: existingStyle.minWidth || baseStyle.minWidth,
    minHeight: existingStyle.minHeight || baseStyle.minHeight,
  };
};

