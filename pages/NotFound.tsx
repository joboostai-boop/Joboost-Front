import React from 'react';
import { Link } from 'react-router-dom';
import { Home as HomeIcon, LogIn, Compass } from 'lucide-react';

// Page 404 publique : affichée pour toute URL inconnue (lien cassé, typo dans une pub…).
// Propose des chemins de récupération clairs plutôt qu'une impasse.
const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Jo<span className="text-[#7D5CFF]">Boost</span>
        </div>

        <div className="space-y-3">
          <p className="text-[7rem] leading-none font-black bg-gradient-to-br from-[#4F46E5] to-[#7D5CFF] bg-clip-text text-transparent">
            404
          </p>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Cette page a changé de poste.</h1>
          <p className="text-slate-500 font-medium">
            Le lien est cassé ou la page n'existe plus. Revenez à l'accueil pour reprendre votre recherche d'emploi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#7D5CFF] text-white rounded-2xl font-bold text-sm hover:bg-[#6D28D9] transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <HomeIcon size={16} /> Retour à l'accueil
          </Link>
          <Link
            to="/auth/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm hover:border-[#7D5CFF] hover:text-[#7D5CFF] transition-colors"
          >
            <LogIn size={16} /> Se connecter
          </Link>
        </div>

        <Link
          to="/auth/register"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#7D5CFF] transition-colors"
        >
          <Compass size={13} /> Découvrir JoBoost gratuitement
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
