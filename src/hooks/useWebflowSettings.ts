import { useState, useEffect } from "react";

export interface WebflowSettingsData {
  siteId: string;
  syncOptions: {
    autoDraft: boolean;
    includeImages: boolean;
    skipExisting: boolean;
  };
}

const STORAGE_KEY = "webflowSettings";

const defaultSettings: WebflowSettingsData = {
  siteId: "",
  syncOptions: {
    autoDraft: true,
    includeImages: true,
    skipExisting: false,
  },
};

export function useWebflowSettings() {
  const [settings, setSettings] =
    useState<WebflowSettingsData>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (e) {
        console.error("Failed to parse saved WebflowSettings:", e);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings: WebflowSettingsData) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  };

  return {
    settings,
    updateSettings,
  };
}
