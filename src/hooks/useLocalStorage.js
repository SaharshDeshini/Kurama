import { useState, useEffect, useCallback } from 'react';

/**
 * Lightweight and safe localStorage hook
 * Uses simple try/catch for both reading and writing to prevent application crashes
 */
export function useLocalStorage(key, initialValue) {
  // Read initial value with safe try/catch
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
    } catch (error) {
      console.warn(`[Personal OS] Error reading localStorage key "${key}":`, error);
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  // Setter function with safe try/catch
  const setValue = useCallback((value) => {
    try {
      setStoredValue(prev => {
        const valueToStore = typeof value === 'function' ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (writeErr) {
          console.warn(`[Personal OS] Error writing to localStorage key "${key}":`, writeErr);
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(`[Personal OS] Error updating state for "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}
