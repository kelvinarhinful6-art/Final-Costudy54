import React, { createContext, useContext, useState } from "react";

export interface ThemeColors {
  yellow: string;
  blue: string;
  red: string;
  green: string;
  black: string;      // Main Background
  darkGray: string;   // Card / Surface Background
  cardBorder: string; // Border color
  surfaceHover: string;
  lightGray: string;  // Subtitle / Secondary text
  white: string;      // Primary Heading / Primary text
  textMuted: string;  // Muted text
  sky: [string, string, string, string];
  glassBg: string;
  glassBorder: string;
  textOnSky: string;
  textSoft: string;
  textFaint: string;
  accentInk: string;
}

export const darkColors: ThemeColors = {
  yellow: '#FFD600',
  blue: '#2563EB',
  red: '#EF4444',
  green: '#22C55E',
  black: '#0B0B0B',
  darkGray: '#1A1A1A',
  cardBorder: '#262626',
  surfaceHover: '#2A2A2A',
  lightGray: '#E5E7EB',
  white: '#FFFFFF',
  textMuted: '#9CA3AF',
  sky: ['#0B0B0B', '#111827', '#1A1A1A', '#0B0B0B'],
  glassBg: 'rgba(26, 26, 26, 0.85)',
  glassBorder: '#262626',
  textOnSky: '#FFFFFF',
  textSoft: '#E5E7EB',
  textFaint: '#9CA3AF',
  accentInk: '#0B0B0B',
};

export const lightColors: ThemeColors = {
  yellow: '#D97706',
  blue: '#2563EB',
  red: '#DC2626',
  green: '#16A34A',
  black: '#F8FAFC',
  darkGray: '#FFFFFF',
  cardBorder: '#E2E8F0',
  surfaceHover: '#F1F5F9',
  lightGray: '#475569',
  white: '#0F172A',
  textMuted: '#64748B',
  sky: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#F8FAFC'],
  glassBg: 'rgba(255, 255, 255, 0.90)',
  glassBorder: '#E2E8F0',
  textOnSky: '#0F172A',
  textSoft: '#475569',
  textFaint: '#64748B',
  accentInk: '#FFFFFF',
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
