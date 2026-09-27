import React from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Subtle page transition (fade + 6px slide, 200ms) replayed on every
 * route change. Keyed by pathname so the animation restarts on navigate.
 */
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-page-enter">
      {children}
    </div>
  );
};
