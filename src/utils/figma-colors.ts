/**
 * Figma Color System
 * Based on the Figma Color Styles provided
 */

export const figmaColors = {
  // Base Colors
  base: {
    primaryBlue: '#1A73E8',
    primaryHoverBlue: '#1557B0',
    backgroundWhite: '#FFFFFF',
    lightGray: '#F8F9FA',
    darkFooter: '#202124',
  },
  
  // Text Colors
  text: {
    primary: '#202124',
    secondary: '#5F6368',
    inverse: '#FFFFFF',
  },
  
  // Google Accent Colors
  google: {
    blue: '#4285F4',
    red: '#EA4335',
    yellow: '#FBBC05',
    green: '#34A853',
  },
  
  // Utility Colors
  utility: {
    borderGray: '#E0E0E0',
    shadowLight: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(0, 0, 0, 0.2)',
  },
} as const;

// Tailwind CSS class utilities for quick styling
export const figmaTailwindClasses = {
  // Background colors
  bg: {
    primary: 'bg-[#1A73E8]',
    primaryHover: 'bg-[#1557B0]',
    white: 'bg-[#FFFFFF]',
    lightGray: 'bg-[#F8F9FA]',
    darkFooter: 'bg-[#202124]',
    googleBlue: 'bg-[#4285F4]',
    googleRed: 'bg-[#EA4335]',
    googleYellow: 'bg-[#FBBC05]',
    googleGreen: 'bg-[#34A853]',
  },
  
  // Text colors
  text: {
    primary: 'text-[#202124]',
    secondary: 'text-[#5F6368]',
    inverse: 'text-[#FFFFFF]',
    googleBlue: 'text-[#4285F4]',
    googleRed: 'text-[#EA4335]',
    googleYellow: 'text-[#FBBC05]',
    googleGreen: 'text-[#34A853]',
  },
  
  // Border colors
  border: {
    gray: 'border-[#E0E0E0]',
    primary: 'border-[#1A73E8]',
  },
  
  // Shadow utilities
  shadow: {
    light: 'shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
    strong: 'shadow-[0_4px_16px_rgba(0,0,0,0.2)]',
  },
} as const;

// Helper function to get color with opacity
export const getColorWithOpacity = (color: string, opacity: number): string => {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Material Design 3 elevation shadows using Figma colors
export const materialShadows = {
  elevation1: '0 1px 3px rgba(32, 33, 36, 0.1)',
  elevation2: '0 2px 6px rgba(32, 33, 36, 0.15)',
  elevation3: '0 4px 8px rgba(32, 33, 36, 0.15)',
  elevation4: '0 6px 12px rgba(32, 33, 36, 0.15)',
  elevation5: '0 8px 16px rgba(32, 33, 36, 0.2)',
} as const;