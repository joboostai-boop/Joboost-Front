import React, { useState } from 'react';

/* Avatar de l'utilisateur : sa photo de profil si elle existe (téléversée, Google
   ou LinkedIn), sinon ses initiales. Une photo distante cassée retombe sur les
   initiales au lieu d'afficher une icône d'image brisée. */

export const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JB';

interface AvatarProps {
  name?: string;
  photoUrl?: string | null;
  /** Diamètre en pixels. */
  size?: number;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, size = 32, className = '' }) => {
  const [broken, setBroken] = useState(false);
  const showPhoto = !!photoUrl && !broken;
  return (
    <span
      className={`relative inline-grid place-items-center rounded-full overflow-hidden shrink-0 font-semibold select-none ${
        showPhoto ? 'bg-subtle' : 'bg-brand/10 text-brand dark:text-brand-300'
      } ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {showPhoto ? (
        <img
          src={photoUrl!}
          alt={name ? `Photo de ${name}` : 'Photo de profil'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
};

export default Avatar;
