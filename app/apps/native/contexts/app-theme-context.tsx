import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, I18nManager, useColorScheme } from "react-native";
import { Uniwind } from "uniwind";

import { type AppLanguage, isArabicLanguage, type TranslationKey, translate, type ThemeMode } from "@/lib/app-shell";

type ThemeName = "light" | "dark";

type AppThemeContextType = {
  currentTheme: ThemeName;
  themeMode: ThemeMode;
  isLight: boolean;
  isDark: boolean;
  language: AppLanguage;
  isRtl: boolean;
  rtlNeedsRestart: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "joumla-theme-mode";
const LANGUAGE_STORAGE_KEY = "joumla-language";

async function savePreference(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignore storage failures and keep the in-memory preference.
  }
}

async function loadPreference(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [language, setLanguageState] = useState<AppLanguage>("fr");
  const [rtlNeedsRestart, setRtlNeedsRestart] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydratePreferences() {
      const [savedThemeMode, savedLanguage] = await Promise.all([
        loadPreference(THEME_STORAGE_KEY),
        loadPreference(LANGUAGE_STORAGE_KEY),
      ]);

      if (!isMounted) {
        return;
      }

      if (savedThemeMode === "system" || savedThemeMode === "light" || savedThemeMode === "dark") {
        setThemeMode(savedThemeMode);
      }

      if (savedLanguage === "fr" || savedLanguage === "ar") {
        setLanguageState(savedLanguage);
        setRtlNeedsRestart(I18nManager.isRTL !== isArabicLanguage(savedLanguage));
      }
    }

    hydratePreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentTheme = useMemo<ThemeName>(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }

    return themeMode;
  }, [systemColorScheme, themeMode]);

  useEffect(() => {
    Uniwind.setTheme(currentTheme);
  }, [currentTheme]);

  const isLight = useMemo(() => {
    return currentTheme === "light";
  }, [currentTheme]);

  const isDark = useMemo(() => {
    return currentTheme === "dark";
  }, [currentTheme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeMode(newTheme);
    void savePreference(THEME_STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextThemeMode: ThemeMode =
      themeMode === "system" ? "light" : themeMode === "light" ? "dark" : "system";

    setTheme(nextThemeMode);
  }, [setTheme, themeMode]);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    const nextIsRtl = isArabicLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    void savePreference(LANGUAGE_STORAGE_KEY, nextLanguage);

    const restartRequired = I18nManager.isRTL !== nextIsRtl;
    setRtlNeedsRestart(restartRequired);

    I18nManager.allowRTL(nextIsRtl);
    I18nManager.forceRTL(nextIsRtl);
    I18nManager.swapLeftAndRightInRTL(nextIsRtl);

    if (restartRequired) {
      Alert.alert(translate(nextLanguage, "restartRtlTitle"), translate(nextLanguage, "restartRtlBody"));
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => {
      return translate(language, key);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      currentTheme,
      themeMode,
      isLight,
      isDark,
      language,
      isRtl: isArabicLanguage(language),
      rtlNeedsRestart,
      setTheme,
      toggleTheme,
      setLanguage,
      t,
    }),
    [currentTheme, isLight, isDark, language, rtlNeedsRestart, setLanguage, setTheme, t, themeMode, toggleTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
