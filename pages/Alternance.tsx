import React, { useState, useEffect } from 'react';
import { Search, MapPin, GraduationCap, Zap, Send, Building2, CheckCircle2, ExternalLink, Sparkles, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import EmptyState from '../components/EmptyState';
import RadiusSelect from '../components/RadiusSelect';

interface AlternanceResult {
  id: string;
  kind: 'offre' | 'entreprise';
  title: string;
  company: string;
  location?: string;
  contractType?: string;
  description?: string;
  recipientId?: string;
  applyUrl?: string;
}

const API = import.meta.env.VITE_API_URL || '';

// Niveaux de diplôme visés (nomenclature européenne utilisée par l'API).
const DIPLOMAS = [
  { value: '', label: 'Tous les niveaux' },
  { value: '3', label: 'CAP, BEP' },
  { value: '4', label: 'Bac, Bac Pro' },
  { value: '5', label: 'BTS, DUT (Bac+2)' },
  { value: '6', label: 'Licence (Bac+3)' },
  { value: '7', label: 'Master (Bac+5)' },
];

const Alternance: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [diploma, setDiploma] = useState('');
  const [radius, setRadius] = useState(30);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AlternanceResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});
  const [confirmTarget, setConfirmTarget] = useState<AlternanceResult | null>(null);

  useEffect(() => {
    if (user) {
      setJobTitle(user.title || '');
      setLocation([user.city, (user as any).postalCode].filter(Boolean).join(' ') || '');
    }
  }, [user]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!location) { toast.error('Indiquez une ville.'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ location, distance: String(radius) });
      if (jobTitle) params.set('jobTitle', jobTitle);
      if (diploma) params.set('diploma', diploma);
      const res = await fetch(`${API}/api/alternance/search?${params}`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        setSearched(true);
        toast.success(`${data.count} opportunité${data.count > 1 ? 's' : ''} en alternance.`);
      } else {
        toast.error(data.error || 'Erreur de recherche.');
      }
    } catch {
      toast.error('Erreur de recherche.');
    } finally {
      setLoading(false);
    }
  };

  // Envoi réel : l'API gouvernementale transmet la candidature au recruteur.
  const doApply = async (item: AlternanceResult) => {
    setConfirmTarget(null);
    setSending((s) => ({ ...s, [item.id]: true }));
    const toastId = toast.loading('Envoi de votre candidature…');
    try {
      const res = await fetch(`${API}/api/alternance/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: item.recipientId,
          company: item.company,
          title: item.title,
          message: `Bonjour,\n\nActuellement à la recherche d'une alternance sur le poste de ${item.title}, je vous adresse ma candidature. Vous trouverez mon CV en pièce jointe.\n\nJe reste disponible pour un échange.\n\nCordialement,\n${user?.name || ''}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSentIds((s) => ({ ...s, [item.id]: true }));
        toast.success('Candidature envoyée et ajoutée à votre suivi !', { id: toastId });
      } else {
        toast.error(data.error || "Échec de l'envoi.", { id: toastId });
      }
    } catch {
      toast.error('Erreur réseau.', { id: toastId });
    } finally {
      setSending((s) => ({ ...s, [item.id]: false }));
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Confirmation avant envoi réel */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmTarget(null)}>
          <div className="surface p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111827] dark:text-white flex items-center gap-2">
              <Send size={18} className="text-[#7D5CFF]" /> Envoyer votre candidature ?
            </h3>
            <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB]">
              Votre <strong>CV</strong> et un message de motivation seront transmis à <strong>{confirmTarget.company}</strong> pour
              le poste « {confirmTarget.title} ».
            </p>
            <p className="text-xs text-[#6B7280] bg-[#F3F4F6] dark:bg-[#1F2937] rounded p-3">
              L'envoi est effectué par La Bonne Alternance (service public). Le recruteur vous répondra directement par email.
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setConfirmTarget(null)} className="btn btn-secondary flex-1">Annuler</button>
              <button onClick={() => doApply(confirmTarget)} className="btn btn-primary flex-1">Confirmer l'envoi</button>
            </div>
          </div>
        </div>
      )}

      {/* Bandeau explicatif */}
      <div className="surface p-4 flex items-start gap-3 border-l-4 border-[#7D5CFF]">
        <Sparkles className="text-[#7D5CFF] shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB]">
          <strong className="text-[#111827] dark:text-white">Postulez en 1 clic.</strong> Offres et entreprises qui recrutent
          en alternance, via le service public. Votre CV est envoyé directement au recruteur — sans quitter Joboost.
        </p>
      </div>

      <form onSubmit={handleSearch} className="surface p-5 md:p-6">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-white mb-4">Votre recherche d'alternance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="input-label">Métier visé</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="input-pro pl-10" placeholder="Ex: Vendeur" />
            </div>
          </div>
          <div>
            <label className="input-label">Localisation</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-pro pl-10" placeholder="Ex: Mantes-la-Jolie" />
            </div>
          </div>
          <div>
            <label className="input-label">Niveau visé</label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <select value={diploma} onChange={(e) => setDiploma(e.target.value)} className="input-pro pl-10">
                {DIPLOMAS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <RadiusSelect value={radius} onChange={setRadius} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-6">
          {loading ? <Zap className="animate-spin" size={18} /> : <GraduationCap size={18} />}
          Trouver mon alternance
        </button>
      </form>

      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="space-y-2"><div className="skeleton h-4 w-48 rounded" /><div className="skeleton h-3 w-32 rounded" /></div>
              </div>
              <div className="skeleton h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((item) => {
            const busy = sending[item.id];
            const done = sentIds[item.id];
            const canApply = !!item.recipientId;
            return (
              <div key={item.id} className={`surface p-5 flex flex-col md:flex-row gap-6 transition-all duration-200 animate-fade-in-up ${busy ? 'opacity-70 pointer-events-none ring-1 ring-[#7D5CFF]' : 'hover:shadow-card-hover hover:-translate-y-0.5'}`}>
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center font-semibold text-sm shrink-0">
                      {item.company?.charAt(0) || <Building2 size={18} />}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#111827] dark:text-white leading-tight">{item.title}</h2>
                      <p className="text-[#6B7280] text-xs mt-0.5">{item.company}</p>
                      {item.location && <p className="text-[#6B7280] text-xs flex items-center gap-1.5 mt-1"><MapPin size={13} /> {item.location}</p>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="px-2 py-1 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 border border-[#7D5CFF] text-[#7D5CFF] rounded">
                      {item.contractType || 'Alternance'}
                    </span>
                    <span className="px-2 py-1 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB] rounded">
                      {item.kind === 'offre' ? 'Offre publiée' : 'Candidature spontanée'}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF] line-clamp-3">{item.description}</p>
                  )}
                </div>

                <div className="md:w-60 flex flex-col gap-3 justify-center shrink-0 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#1F2937] pt-4 md:pt-0 md:pl-6">
                  {done ? (
                    <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={22} />
                      <span className="text-sm font-semibold">Candidature envoyée</span>
                      <button onClick={() => navigate('/track/applications')} className="text-xs text-[#7D5CFF] hover:underline">Voir mon suivi</button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => setConfirmTarget(item)} disabled={busy || !canApply} className="btn btn-primary w-full">
                        <div className="flex items-center justify-center gap-2">
                          {busy ? <Zap className="animate-spin" size={16} /> : <Send size={16} />}
                          <span>Postuler en 1 clic</span>
                        </div>
                      </button>
                      {!canApply && (
                        <p className="text-xs text-[#6B7280] flex items-start gap-1.5">
                          <Info size={12} className="mt-0.5 shrink-0" /> Candidature à faire sur l'annonce.
                        </p>
                      )}
                      {item.applyUrl && (
                        <a href={item.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full">
                          <div className="flex items-center justify-center gap-2"><ExternalLink size={15} /> Voir l'annonce</div>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="card-pro flex flex-col items-center text-center gap-2 py-10 text-slate-400">
          <GraduationCap size={24} />
          <span className="text-sm font-medium">Aucune alternance trouvée. Élargissez le rayon ou changez de métier.</span>
        </div>
      )}

      {!loading && !searched && (
        <EmptyState
          variant="companies"
          title="Trouvez votre alternance"
          description="Offres et entreprises qui recrutent en alternance près de chez vous. Postulez en 1 clic : votre CV part directement au recruteur."
        />
      )}
    </div>
  );
};

export default Alternance;
