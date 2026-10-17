import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ThemeSwatch } from '../types';

interface BackgroundGradientsProps {
  theme?: ThemeSwatch;
}

export const BackgroundGradients: React.FC<BackgroundGradientsProps> = ({ theme: propTheme }) => {
  const { activeTheme, isLightMode } = useTheme();
  const theme = propTheme || activeTheme;
  const isLight = isLightMode || theme?.mode === 'light';

  return (
    <div
      id="sems-background-decorations"
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 transition-colors duration-500"
      aria-hidden="true"
    >
      {/* Clean base background */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          backgroundColor: isLight ? 'var(--app-bg, #E8EDF5)' : 'var(--app-bg, #070B14)',
          backgroundImage: isLight
            ? 'linear-gradient(180deg, var(--bg-start, #E8EDF5) 0%, var(--bg-end, #DCE3EB) 100%)'
            : 'linear-gradient(180deg, var(--bg-start, #070B14) 0%, var(--bg-end, #0A101F) 100%)',
        }}
      />

      {/* Very faint, restrained ambient highlight at top */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] transition-opacity duration-500"
        style={{
          background: isLight ? 'rgba(15, 118, 110, 0.04)' : 'rgba(45, 212, 191, 0.04)',
        }}
      />
    </div>
  );
};

