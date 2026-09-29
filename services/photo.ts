import { authHeaders } from './authToken';

/* Lit une image locale, la recadre en carré centré et la réduit (JPEG).
   Objectif : une photo nette SANS stocker un base64 énorme : elle est
   enregistrée sur le profil (et voyage avec /auth/me) ou dans le JSON du CV.
   256 px à 0,82 ≈ 15-25 Ko ; le serveur refuse au-delà de ~90 Ko. */
export const readAndResizePhoto = (file: File, size = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('type')); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        // Fond blanc : une photo PNG transparente ne vire pas au noir en JPEG.
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });

/* Enregistre (ou retire, avec '') la photo sur le profil. Lève une erreur lisible. */
export const saveProfilePhoto = async (photoUrl: string): Promise<void> => {
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ photoUrl }),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  if (!res.ok || !data?.success) throw new Error(data?.error || "La photo n'a pas pu être enregistrée.");
};
