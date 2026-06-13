
import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  monochrome?: boolean;
  /** Rendu clair pour fond sombre (sidebar/topbar premium). */
  onDark?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', className = "h-10", monochrome = false, onDark = false }) => {
  const joClass = monochrome ? 'text-current' : onDark ? 'text-white' : 'text-slate-900 dark:text-white';
  const boostClass = monochrome ? 'text-current' : onDark ? 'text-[#A78BFA]' : 'text-[#7D5CFF]';
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Logo Text */}
      {variant === 'full' && (
        <div className="flex items-baseline font-black tracking-tighter text-3xl font-sans">
          <span className={joClass}>Jo</span>
          <span className={boostClass}>Boost</span>
        </div>
      )}

      {/* Icon Variant (if needed) */}
      {variant === 'icon' && (
        <div className={`flex items-center justify-center font-black text-3xl ${onDark ? 'text-[#A78BFA]' : 'text-[#7D5CFF]'}`}>
          J
        </div>
      )}
    </div>
  );
};

export default Logo;
