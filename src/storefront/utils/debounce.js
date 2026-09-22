import { useRef, useEffect, useCallback } from 'react';

/**
 * Standard debounce function to stop rapid-fire execution of a function.
 * @param {Function} func 
 * @param {number} wait Milliseconds to wait (default: 300ms)
 * @returns {Function} Debounced function with .cancel() method
 */
export function debounce(func, wait = 300) {
  let timeoutId = null;

  const debounced = function (...args) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      func.apply(this, args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * React hook that returns a memoized debounced callback.
 * Automatically cleans up pending timers on unmount.
 * @param {Function} callback 
 * @param {number} delay (default: 300ms)
 * @returns {Function}
 */
export function useDebouncedCallback(callback, delay = 300) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}
