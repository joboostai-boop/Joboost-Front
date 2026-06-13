
import React from 'react';

interface LogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  monochrome?: boolean;
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', className = "h-10", monochrome = false }) => {
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Logo Text */}
      {variant === 'full' && (
        <div className="flex items-baseline font-black tracking-tighter text-3xl font-sans">
          <span className={`${monochrome ? 'text-current' : 'text-slate-900 dark:text-white'}`}>Jo</span>
          <span className={`${monochrome ? 'text-current' : 'text-[#7D5CFF]'}`}>Boost</span>
        </div>
      )}
      
      {/* Icon Variant (if needed) */}
      {variant === 'icon' && (
        <div className="flex items-center justify-center font-black text-3xl text-[#7D5CFF]">
          J
        </div>
      )}
    </div>
  );
};

export default Logo;
