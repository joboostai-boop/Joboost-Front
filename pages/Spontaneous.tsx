import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Zap, BookOpen, Navigation, Target, Send, CheckSquare, Square, Mail, ShieldCheck, ShieldAlert, Lock, ExternalLink, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import MatchRing from '../components/MatchRing';
import EmptyState from '../components/EmptyState';
import RadiusSelect from '../components/RadiusSelect';
import QuotaDialog from '../components/QuotaDialog';

type AutoLevel = 'AUTO_SAFE' | 'AUTO_REVIEW' | 'NO_SEND';

interface CompanyResult {
  id: string;
  name: string;
  address: string;
  sector: string;
  hiringPotential: string;
  size: string;
  contractType?: string;
  matchedJob: string;
  reason: string;
  contactRole: string;
  offerUrl?: string;
  domain?: string;
  // Enrichissement scoring (backend)
  autoLevel: AutoLevel;
  autoLevelLabel: string;
  autoScore: number;
  autoBlockReason: string | null;
  matchScore: number;
  contactEmail: string | null;
  contactSource: string;
}

const API = import.meta.env.VITE_API_URL || '';

// ─── Badge niveau d'automatisation ───
const AutoLevelBadge: React.FC<{ level: AutoLevel; label: string; score: number }> = ({ level, label, score }) => {
  const styles: Record<AutoLevel, string> = {
    AUTO_SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AUTO_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
    NO_SEND: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const Icon = level === 'AUTO_SAFE' ? ShieldCheck : level === 'AUTO_REVIEW' ? ShieldAlert : Lock;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${styles[level]}`} title={`Score d'automatisation : ${score}/100`}>
      <Icon size={13} /> {label}
    </span>
  );
};

type FilterId = 'ALL' | AutoLevel;
const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'ALL', label: 'Tout' },
  { id: 'AUTO_SAFE', label: 'Envoi auto' },
  { id: 'AUTO_REVIEW', label: 'À valider' },
  { id: 'NO_SEND', label: 'Manuel' },
];

const Spontaneous: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(30); // rayon de recherche en km
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  const [filter, setFilter] = useState<FilterId>('ALL');
  const [includeLetterMap, setIncludeLetterMap] = useState<Record<string, boolean>>({});
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [editingEmail, setEditingEmail] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState<string | undefined>();

  useEffect(() => {
    if (user) {
      setJobTitle(user.title || '');
      // Ville fixe : reprend automatiquement ville + code postal du profil (plus besoin de retaper).
      setLocation([user.city, (user as any).postalCode].filter(Boolean).join(' ') || '');
      setLoadingInit(false);
    }
  }, [user]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobTitle || !location) {
      toast.error('Veuillez saisir un métier et une ville.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/lbb/search?jobTitle=${encodeURIComponent(jobTitle)}&location=${encodeURIComponent(location)}&distance=${radius}`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success) {
        const results: CompanyResult[] = data.results;
        setCompanies(results);
        const letters: Record<string, boolean> = {};
        const emails: Record<string, string> = {};
        results.forEach((c) => { letters[c.id] = true; emails[c.id] = c.contactEmail || ''; });
        setIncludeLetterMap(letters);
        setEmailMap(emails);
        setFilter('ALL');
        toast.success(`${results.length} entreprise${results.length > 1 ? 's' : ''} détectée${results.length > 1 ? 's' : ''}.`);
      } else {
        toast.error(data.error || 'Erreur de recherche.');
      }
    } catch {
      toast.error('Erreur de recherche.');
    } finally {
      setLoading(false);
    }
  };

  const toggleIncludeLetter = (id: string) => setIncludeLetterMap((p) => ({ ...p, [id]: !p[id] }));

  // Prépare la candidature côté serveur puis tente l'envoi (ou bascule en manuel).
  const handleSend = async (company: CompanyResult) => {
    setProcessing((p) => ({ ...p, [company.id]: true }));
    const includeLetter = includeLetterMap[company.id];
    const editedEmail = (emailMap[company.id] || '').trim();
    const toastId = toast.loading(includeLetter ? 'Génération de la lettre IA…' : 'Préparation de la candidature…');

    try {
      // 1) Préparation (scoring serveur + lettre + entrée de suivi)
      const prepRes = await fetch(`${API}/api/spontaneous/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          companyName: company.name,
          companyAddress: company.address,
          companySector: company.sector,
          companySize: company.size,
          domain: company.domain,
          contactEmail: editedEmail || company.contactEmail || undefined,
          contactSource: editedEmail && editedEmail !== company.contactEmail ? 'manual' : company.contactSource,
          contactRole: company.contactRole,
          jobTitle,
          ftOfferUrl: company.offerUrl || '',
          ftSource: company.autoBlockReason?.includes('démonstration') ? 'demo' : 'francetravail',
          reason: company.reason,
          hiringPotential: company.hiringPotential,
          includeLetter,
        }),
      });
      const prep = await prepRes.json();
      if (!prep.success) {
        if (prep.code === 'QUOTA_EXCEEDED') {
          // Quota atteint : on retire le toast de chargement et on PROPOSE l'offre adaptée.
          toast.dismiss(toastId);
          setQuotaMessage(prep.error);
          setQuotaOpen(true);
          return;
        }
        toast.error(prep.error || 'Impossible de préparer la candidature.', { id: toastId });
        return;
      }

      const spId = prep.data.id;
      toast.loading('Envoi en cours…', { id: toastId });

      // 2) Envoi (ou bascule manuelle / blocage)
      const sendRes = await fetch(`${API}/api/spontaneous/${spId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
      });
      const sent = await sendRes.json();

      if (sent.success && sent.manual) {
        toast.success(sent.message || 'Candidature préparée — à finaliser manuellement.', { id: toastId, duration: 5000 });
        if (sent.applyUrl) window.open(sent.applyUrl, '_blank', 'noopener');
        navigate('/track/applications');
      } else if (sent.success) {
        toast.success('Candidature envoyée et ajoutée à votre suivi !', { id: toastId });
        navigate('/track/applications');
      } else {
        toast.error(sent.error || "Échec de l'envoi.", { id: toastId });
      }
    } catch {
      toast.error('Erreur réseau.', { id: toastId });
    } finally {
      setProcessing((p) => ({ ...p, [company.id]: false }));
    }
  };

  const navToLetter = (company: CompanyResult) => {
    navigate('/target/letter', { state: { jobTitle, company: company.name, targetContext: company.reason } });
  };

  const counts = (id: FilterId) => (id === 'ALL' ? companies.length : companies.filter((c) => c.autoLevel === id).length);
  const visible = filter === 'ALL' ? companies : companies.filter((c) => c.autoLevel === filter);

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <QuotaDialog open={quotaOpen} onClose={() => setQuotaOpen(false)} message={quotaMessage} />
      <form onSubmit={handleSearch} className="surface p-5 md:p-6">
        <h3 className="text-sm font-semibold text-[#111827] dark:text-white mb-4">Critères de ciblage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Métier ciblé</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={loadingInit} className="input-pro pl-10" placeholder="Ex: Développeur React" />
            </div>
          </div>
          <div>
            <label className="input-label">Localisation <span className="font-normal text-[#9CA3AF]">· depuis ton profil</span></label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} disabled={loadingInit} className="input-pro pl-10" placeholder="Ex: Magnanville 78200" />
            </div>
          </div>
          <RadiusSelect value={radius} onChange={setRadius} disabled={loadingInit} />
        </div>
        <button type="submit" disabled={loading || loadingInit} className="btn btn-primary btn-lg w-full mt-6">
          {loading ? <Zap className="animate-spin" size={18} /> : <Target size={18} />}
          Lancer le radar d'entreprises
        </button>
      </form>

      {/* Skeletons */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="space-y-2"><div className="skeleton h-4 w-40 rounded" /><div className="skeleton h-3 w-28 rounded" /></div>
              </div>
              <div className="flex gap-2"><div className="skeleton h-6 w-20 rounded" /><div className="skeleton h-6 w-24 rounded" /></div>
              <div className="skeleton h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && companies.length > 0 && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  filter === f.id ? 'bg-[#7D5CFF] text-white border-[#7D5CFF]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {f.label} <span className={filter === f.id ? 'text-white/80' : 'text-slate-400'}>{counts(f.id)}</span>
              </button>
            ))}
          </div>

          {visible.map((company) => {
            const busy = processing[company.id] || false;
            const wantsLetter = includeLetterMap[company.id] || false;
            const blocked = company.autoLevel === 'NO_SEND';
            const ctaLabel = blocked ? 'Postuler manuellement' : company.autoLevel === 'AUTO_REVIEW' ? 'Valider et envoyer' : 'Envoyer la candidature';

            return (
              <div key={company.id} className={`surface p-5 flex flex-col md:flex-row gap-6 transition-all duration-200 group animate-fade-in-up ${busy ? 'opacity-70 pointer-events-none ring-1 ring-[#7D5CFF]' : 'hover:shadow-card-hover hover:-translate-y-0.5'}`}>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-sm shrink-0">
                        {company.name?.charAt(0) || <Building2 size={18} />}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[#111827] dark:text-white leading-tight">{company.name}</h2>
                        <p className="text-[#6B7280] text-xs flex items-center gap-1.5 mt-0.5"><MapPin size={13} /> {company.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {company.matchScore ? <MatchRing score={company.matchScore} size={40} /> : null}
                      <AutoLevelBadge level={company.autoLevel} label={company.autoLevelLabel} score={company.autoScore} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="px-2 py-1 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB] rounded">{company.sector}</span>
                    {company.contractType && <span className="px-2 py-1 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB] rounded">{company.contractType}</span>}
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Potentiel {company.hiringPotential}</span>
                    <span className="px-2 py-1 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 border border-[#7D5CFF] text-[#7D5CFF] rounded flex items-center gap-1"><BookOpen size={12} /> {company.contactRole}</span>
                  </div>

                  {/* Email contact (éditable) */}
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={15} className="text-[#9CA3AF] shrink-0" />
                    {editingEmail[company.id] ? (
                      <input
                        type="email"
                        value={emailMap[company.id] || ''}
                        onChange={(e) => setEmailMap((m) => ({ ...m, [company.id]: e.target.value }))}
                        onBlur={() => setEditingEmail((s) => ({ ...s, [company.id]: false }))}
                        autoFocus
                        placeholder="contact@entreprise.fr"
                        className="input-pro py-1 text-sm flex-1"
                      />
                    ) : (
                      <button onClick={() => setEditingEmail((s) => ({ ...s, [company.id]: true }))} className="flex items-center gap-1.5 text-[#4B5563] dark:text-[#D1D5DB] hover:text-[#7D5CFF] group/email">
                        {emailMap[company.id] ? <span>{emailMap[company.id]}</span> : <span className="italic text-[#9CA3AF]">Aucun e-mail — cliquez pour ajouter</span>}
                        <Pencil size={12} className="opacity-0 group-hover/email:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-[#F3F4F6] dark:bg-[#1F2937] rounded border-l-4 border-[#D1D5DB] dark:border-[#4B5563]">
                    <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF]"><strong>Cible :</strong> {company.reason}</p>
                    {blocked && company.autoBlockReason && (
                      <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5"><Lock size={12} /> Envoi auto bloqué : {company.autoBlockReason}</p>
                    )}
                  </div>
                </div>

                <div className="md:w-64 flex flex-col gap-3 justify-center shrink-0 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#1F2937] pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-2 cursor-pointer group/check" onClick={() => toggleIncludeLetter(company.id)}>
                    {wantsLetter ? <CheckSquare className="text-[#7D5CFF]" size={18} /> : <Square className="text-[#9CA3AF] group-hover/check:text-[#7D5CFF] transition-colors" size={18} />}
                    <span className={`text-xs font-bold transition-colors ${wantsLetter ? 'text-[#7D5CFF]' : 'text-[#6B7280]'}`}>Inclure lettre de motivation (IA)</span>
                  </div>

                  <button onClick={() => handleSend(company)} disabled={busy} className="btn btn-primary w-full mt-2">
                    <div className="flex items-center justify-center gap-2">
                      {busy ? <Zap className="animate-spin" size={16} /> : blocked ? <ExternalLink size={16} /> : <Send size={16} />}
                      <span>{ctaLabel}</span>
                    </div>
                  </button>

                  <button onClick={() => navToLetter(company)} disabled={busy} className="btn btn-secondary w-full">
                    Aperçu manuel de la lettre
                  </button>
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="card-pro flex flex-col items-center text-center gap-2 py-10 text-slate-400">
              <Navigation size={24} />
              <span className="text-sm font-medium">Aucune entreprise dans ce filtre.</span>
            </div>
          )}
        </div>
      )}

      {/* État vide initial */}
      {!loading && companies.length === 0 && (
        <EmptyState
          variant="companies"
          title="Lancez le radar d'entreprises"
          description="Détectez les entreprises qui recrutent sur votre métier près de chez vous, puis préparez vos candidatures spontanées en un clic."
        />
      )}
    </div>
  );
};

export default Spontaneous;
