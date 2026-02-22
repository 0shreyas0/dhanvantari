'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function WipeToggler() {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    // @ts-ignore - View Transitions API types might not be available yet
    if (!document.startViewTransition) {
      setTheme(theme === 'dark' ? 'light' : 'dark');
      return;
    }

    // @ts-ignore
    document.startViewTransition(() => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    });
  };

  if (!mounted) {
    return (
      <button
        className="relative z-50 p-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:scale-110 transition-transform focus:outline-none cursor-pointer"
        aria-label="Toggle Theme"
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative z-50 p-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-black hover:scale-110 transition-transform focus:outline-none cursor-pointer"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
