import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { readAndResizePhoto, saveProfilePhoto } from '../services/photo';

/* Choisir / changer / retirer sa photo de profil. La photo est enregistrée
   sur le compte : elle apparaît ensuite dans la navigation, sur l'Accueil et,
   par défaut, sur les CV « avec photo ». */

interface Props {
  size?: number;
  /** Mise en page : `inline` (avatar + boutons côte à côte) ou `avatar` (avatar seul cliquable). */
  layout?: 'inline' | 'avatar';
  className?: string;
}

const ProfilePhotoPicker: React.FC<Props> = ({ size = 72, layout = 'inline', className = '' }) => {
  const { user, checkAuth } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasPhoto = !!user?.photoUrl;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await readAndResizePhoto(file, 320);
      await saveProfilePhoto(dataUrl);
      await checkAuth();
      toast.success('Photo de profil mise à jour');
    } catch (err: any) {
      toast.error(err?.message === 'type' || err?.message === 'image' ? 'Ce fichier n’est pas une image lisible.' : err?.message || 'Échec de l’envoi de la photo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await saveProfilePhoto('');
      await checkAuth();
      toast.success('Photo retirée');
    } catch (err: any) {
      toast.error(err?.message || 'Échec de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  const avatarButton = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={busy}
      className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      aria-label={hasPhoto ? 'Changer ma photo de profil' : 'Ajouter une photo de profil'}
      title={hasPhoto ? 'Changer ma photo' : 'Ajouter une photo'}
    >
      <Avatar name={user?.name} photoUrl={user?.photoUrl} size={size} />
      <span className="absolute inset-0 rounded-full grid place-items-center bg-black/45 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
        <Camera size={Math.round(size / 3.5)} />
      </span>
      {busy && (
        <span className="absolute inset-0 rounded-full grid place-items-center bg-black/45 text-white">
          <Loader2 size={Math.round(size / 3.5)} className="animate-spin" />
        </span>
      )}
      {!hasPhoto && !busy && (
        <span className="absolute -bottom-0.5 -right-0.5 w-[34%] h-[34%] min-w-5 min-h-5 rounded-full bg-brand text-white grid place-items-center border-2 border-canvas">
          <Camera size={Math.max(10, Math.round(size / 6.5))} />
        </span>
      )}
    </button>
  );

  return (
    <div className={className}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
      {layout === 'avatar' ? (
        avatarButton
      ) : (
        <div className="flex items-center gap-4">
          {avatarButton}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn btn-secondary !min-h-[34px] !px-3 text-[13px]">
                <Camera size={14} /> {hasPhoto ? 'Changer' : 'Ajouter une photo'}
              </button>
              {hasPhoto && (
                <button type="button" onClick={remove} disabled={busy} className="btn btn-ghost !min-h-[34px] !px-3 text-[13px] hover:!text-red-600">
                  <Trash2 size={14} /> Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-faint">JPEG ou PNG, cadrée automatiquement en carré.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoPicker;
