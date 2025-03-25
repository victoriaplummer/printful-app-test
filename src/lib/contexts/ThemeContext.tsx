"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  enableDarkMode: () => void;
  disableDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  enableDarkMode: () => {},
  disableDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // On mount, check if dark mode is preferred by the system
  useEffect(() => {
    // Check local storage first
    const storedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const shouldUseDarkMode =
      storedTheme === "dim" || (storedTheme === null && systemPrefersDark);
    setIsDarkMode(shouldUseDarkMode);
    applyTheme(shouldUseDarkMode);
  }, []);

  const applyTheme = (isDark: boolean) => {
    // For daisyUI - use silk for light theme and dim for dark theme
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dim" : "silk"
    );

    // Store theme preference
    localStorage.setItem("theme", isDark ? "dim" : "silk");
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      applyTheme(newMode);
      return newMode;
    });
  };

  const enableDarkMode = () => {
    setIsDarkMode(true);
    applyTheme(true);
  };

  const disableDarkMode = () => {
    setIsDarkMode(false);
    applyTheme(false);
  };

  return (
    <ThemeContext.Provider
      value={{ isDarkMode, toggleDarkMode, enableDarkMode, disableDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
