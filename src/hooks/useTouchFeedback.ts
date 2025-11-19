// Hook for providing touch and mouse feedback on interactive elements
// Replaces hover-only states with active/pressed states that work on both touch and mouse

import { useState, useCallback } from 'react';

export interface TouchFeedbackState {
  pressed: boolean;
  handlers: {
    onTouchStart: () => void;
    onTouchEnd: () => void;
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
}

/**
 * Hook that provides pressed state and event handlers for touch/mouse feedback
 * @param options Configuration options
 * @returns Object with pressed state and event handlers
 */
export function useTouchFeedback(options?: {
  onPress?: () => void;
  onRelease?: () => void;
}): TouchFeedbackState {
  const [pressed, setPressed] = useState(false);

  const handlePress = useCallback(() => {
    setPressed(true);
    options?.onPress?.();
  }, [options]);

  const handleRelease = useCallback(() => {
    setPressed(false);
    options?.onRelease?.();
  }, [options]);

  return {
    pressed,
    handlers: {
      onTouchStart: handlePress,
      onTouchEnd: handleRelease,
      onMouseDown: handlePress,
      onMouseUp: handleRelease,
      onMouseLeave: handleRelease,
    },
  };
}

/**
 * Helper to create pressed style based on state
 */
export function getPressedStyle(
  baseStyle: React.CSSProperties,
  pressed: boolean,
  pressedStyle?: Partial<React.CSSProperties>
): React.CSSProperties {
  if (!pressed) return baseStyle;

  const defaultPressedStyle: Partial<React.CSSProperties> = {
    transform: 'scale(0.98)',
    opacity: 0.9,
    ...pressedStyle,
  };

  return {
    ...baseStyle,
    ...defaultPressedStyle,
  };
}

