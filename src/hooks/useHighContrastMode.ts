import { useState, useEffect } from 'react';

export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('highContrastMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    if (isHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    localStorage.setItem('highContrastMode', String(isHighContrast));
  }, [isHighContrast]);

  const toggleHighContrast = () => {
    setIsHighContrast(prev => !prev);
  };

  return { isHighContrast, toggleHighContrast };
};
