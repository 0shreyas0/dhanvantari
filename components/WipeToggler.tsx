'use client';

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

export function WipeToggler() {
  const [mounted, setMounted] = React.useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = (event: React.MouseEvent) => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

    // @ts-ignore
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    // Pass click coordinates to CSS variables for the wipe effect
    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--click-x', `${x}px`);
    document.documentElement.style.setProperty('--click-y', `${y}px`);

    // @ts-ignore
    document.startViewTransition(() => {
      setTheme(nextTheme);
    });
  };

  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative h-9 w-9 rounded-xl border border-border/50 transition-all duration-300
        flex items-center justify-center overflow-hidden
        ${isDark 
          ? 'bg-zinc-900 text-yellow-500 hover:bg-zinc-800' 
          : 'bg-white text-zinc-900 hover:bg-zinc-50'}
      `}
      aria-label="Toggle Theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={resolvedTheme}
          initial={{ y: 20, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -20, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {isDark ? (
            <Sun className="h-5 w-5 fill-current" />
          ) : (
            <Moon className="h-5 w-5 fill-current" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
