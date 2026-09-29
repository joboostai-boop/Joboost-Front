
import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  monochrome?: boolean;
  /** Rendu clair pour fond sombre (sidebar/topbar premium). */
  onDark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', className = "h-10", monochrome = false, onDark = false }) => {
  const joClass = monochrome ? 'text-current' : onDark ? 'text-white' : 'text-ink';
  const boostClass = monochrome ? 'text-current' : onDark ? 'text-brand-300' : 'text-brand';
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Logo Text */}
      {variant === 'full' && (
        <div className="flex items-baseline font-black tracking-tighter text-3xl font-sans">
          <span className={joClass}>Jo</span>
          <span className={boostClass}>boost</span>
        </div>
      )}

      {/* Icon Variant (if needed) */}
      {variant === 'icon' && (
        <div className={`flex items-center justify-center font-black text-3xl ${onDark ? 'text-brand-300' : 'text-brand'}`}>
          J
        </div>
      )}
    </div>
  );
};

export default Logo;
