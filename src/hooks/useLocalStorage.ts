'use client';

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch (e) {
      console.error(`Failed to load ${key} from localStorage:`, e);
    }
    setIsInitialized(true);
  }, [key]);

  // Save to localStorage whenever value changes (after initialization)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to save ${key} to localStorage:`, e);
      }
    }
  }, [key, value, isInitialized]);

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue);
  }, []);

  return [value, updateValue];
}
