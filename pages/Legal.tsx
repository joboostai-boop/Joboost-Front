import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';

/**
 * Pages légales publiques (accessibles sans authentification).
 *
 * IMPORTANT — Les mentions entre crochets [À COMPLÉTER : ...] doivent être
 * renseignées par l'éditeur AVANT toute mise en ligne / campagne publicitaire.
 * Ne rien inventer ici (raison sociale, SIRET, capital, adresse) : un site
 * marchand sans mentions légales exactes expose à des sanctions
 * (art. 6-III LCEN, art. L221-5 Code de la consommation).
 *
 * Ces textes sont des modèles de base pour un service en ligne par abonnement.
 * Ils ne remplacent pas la validation par un professionnel du droit.
 */

const LAST_UPDATE = '10 juin 2026';
const CONTACT_EMAIL = 'joboost.ai@gmail.com';

type Section = { heading: string; body: React.ReactNode };

const TODO: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold text-[0.95em]">
    {children}
  </span>
);

const mentionsLegales: Section[] = [
  {
    heading: '1. Éditeur du site',
    body: (
      <>
        <p>Le site Joboost est édité par :</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Dénomination / nom de l'éditeur : <strong>Sana Anger</strong>, exerçant sous le nom commercial <strong>BOOST</strong></li>
          <li>Forme juridique : Entrepreneur individuel</li>
          <li>Siège social / adresse : 4 allée de Vendée, 78200 Magnanville, France</li>
          <li>SIREN : 105 996 334 — SIRET : 105 996 334 00014</li>
          <li>TVA : TVA non applicable, article 293 B du CGI (franchise en base)</li>
          <li>Adresse e-mail : <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7D5CFF] font-bold hover:underline">{CONTACT_EMAIL}</a></li>
          <li>Directeur de la publication : Sana Anger</li>
        </ul>
      </>
    ),
  },
  {
    heading: '2. Hébergement',
    body: (
      <>
        <p>Le site et ses services sont hébergés par :</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Frontend : <strong>Netlify, Inc.</strong> — 512 2nd Street, Suite 200, San Francisco, CA 94107, USA.</li>
          <li>Backend / API : <strong>Render Services, Inc.</strong> — 525 Brannan St, San Francisco, CA 94107, USA.</li>
          <li>Base de données : <strong>Supabase</strong> (hébergement Union européenne, région eu-west-1).</li>
        </ul>
      </>
    ),
  },
  {
    heading: '3. Propriété intellectuelle',
    body: (
      <p>
        L'ensemble des éléments du site (marque Joboost, logo, textes, interface, code) est protégé par le droit
        de la propriété intellectuelle. Toute reproduction non autorisée est interdite. Les marques et logos de
        tiers éventuellement cités appartiennent à leurs propriétaires respectifs ; leur mention n'implique aucun
        partenariat ni affiliation.
      </p>
    ),
  },
  {
    heading: '4. Contact',
    body: <p>Pour toute question : <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7D5CFF] font-bold hover:underline">{CONTACT_EMAIL}</a>.</p>,
  },
];

const confidentialite: Section[] = [
  {
    heading: '1. Responsable du traitement',
    body: (
      <p>
        Le responsable du traitement des données est l'éditeur du site (voir Mentions légales) :{' '}
        <strong>Sana Anger (BOOST)</strong>, entrepreneur individuel. Pour toute question relative à vos données,
        vous pouvez écrire à <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7D5CFF] font-bold hover:underline">{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    heading: '2. Données collectées',
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Données de compte : nom, adresse e-mail, identifiant de connexion (y compris via Google si vous l'utilisez).</li>
        <li>Données de profil professionnel que vous saisissez : CV, expériences, compétences, lettres de motivation.</li>
        <li>Données d'usage du service (candidatures générées, offres consultées et sauvegardées).</li>
        <li>Données techniques (logs de connexion, type d'appareil) nécessaires au fonctionnement et à la sécurité.</li>
      </ul>
    ),
  },
  {
    heading: '3. Finalités et bases légales',
    body: (
      <ul className="list-disc pl-6 space-y-1">
        <li>Fournir le service (création de compte, génération de CV/lettres, candidatures) — <em>exécution du contrat</em>.</li>
        <li>Gérer les abonnements et paiements — <em>exécution du contrat / obligation légale</em>.</li>
        <li>Améliorer et sécuriser le service — <em>intérêt légitime</em>.</li>
        <li>Communications marketing éventuelles — <em>consentement</em>, révocable à tout moment.</li>
      </ul>
    ),
  },
  {
    heading: '4. Sous-traitants et destinataires',
    body: (
      <>
        <p>Vos données peuvent être traitées par nos prestataires techniques, uniquement pour les besoins du service :</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Hébergement : Netlify, Render, Supabase.</li>
          <li>Paiement : <strong>Stripe</strong> (les données de carte sont traitées directement par Stripe, jamais stockées par Joboost).</li>
          <li>Fonctionnalités d'IA : <strong>Google</strong> (modèles Gemini, via l'API Google AI) — seules les
          données de votre profil nécessaires à la génération demandée lui sont transmises.</li>
        </ul>
        <p className="mt-2">Vos données ne sont jamais vendues à des tiers.</p>
      </>
    ),
  },
  {
    heading: '5. Durée de conservation',
    body: (
      <p>
        Les données sont conservées le temps de votre utilisation du service, puis supprimées ou anonymisées dans
        un délai raisonnable après la clôture du compte, sauf obligation légale de conservation.
      </p>
    ),
  },
  {
    heading: '6. Vos droits (RGPD)',
    body: (
      <>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>Droit d'accès, de rectification et d'effacement de vos données.</li>
          <li>Droit à la limitation et à l'opposition au traitement.</li>
          <li>Droit à la portabilité de vos données (export depuis vos paramètres de compte).</li>
          <li>Droit de retirer votre consentement à tout moment.</li>
        </ul>
        <p className="mt-2">
          Pour exercer ces droits : <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7D5CFF] font-bold hover:underline">{CONTACT_EMAIL}</a>. Vous pouvez également introduire une réclamation
          auprès de la CNIL (www.cnil.fr).
        </p>
      </>
    ),
  },
  {
    heading: '7. Cookies',
    body: (
      <p>
        Le site utilise uniquement des cookies et stockages strictement nécessaires à son fonctionnement (session,
        authentification). Aucun cookie publicitaire ni de mesure d'audience n'est déposé. Si de tels cookies
        venaient à être ajoutés, un bandeau de consentement conforme serait mis en place avant tout dépôt.
      </p>
    ),
  },
];

const cgu: Section[] = [
  {
    heading: '1. Objet',
    body: (
      <p>
        Les présentes conditions générales d'utilisation (CGU) régissent l'accès et l'utilisation du service
        Joboost, plateforme d'aide à la recherche d'emploi assistée par intelligence artificielle.
      </p>
    ),
  },
  {
    heading: '2. Compte utilisateur',
    body: (
      <p>
        L'accès aux fonctionnalités nécessite la création d'un compte. Vous êtes responsable de l'exactitude des
        informations fournies et de la confidentialité de vos identifiants.
      </p>
    ),
  },
  {
    heading: '3. Description du service',
    body: (
      <p>
        Joboost propose des outils d'analyse de CV, de génération de CV et de lettres de motivation, de suggestion
        d'offres et d'envoi de candidatures. Les contenus générés par l'IA sont des aides : ils peuvent comporter
        des erreurs et doivent être relus et validés par l'utilisateur avant tout envoi. Joboost ne garantit aucun
        résultat de recrutement ni aucun nombre d'entretiens ou d'embauches.
      </p>
    ),
  },
  {
    heading: '4. Obligations de l\'utilisateur',
    body: (
      <p>
        Vous vous engagez à utiliser le service de manière loyale, à ne pas fournir d'informations fausses dans vos
        candidatures et à respecter les droits des tiers et des recruteurs.
      </p>
    ),
  },
  {
    heading: '5. Responsabilité',
    body: (
      <p>
        Le service est fourni « en l'état ». Joboost met en œuvre les moyens raisonnables pour assurer sa
        disponibilité mais ne saurait être tenu responsable des interruptions, ni des décisions de recrutement des
        entreprises tierces.
      </p>
    ),
  },
  {
    heading: '6. Résiliation',
    body: (
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. L'éditeur peut suspendre un compte
        en cas de manquement aux présentes CGU.
      </p>
    ),
  },
];

const cgv: Section[] = [
  {
    heading: '1. Offres et prix',
    body: (
      <>
        <p>Joboost propose les formules suivantes (prix TTC, TVA non applicable — art. 293 B du CGI) :</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Gratuit</strong> — 0 € : 1 candidature IA par mois et fonctionnalités de découverte.</li>
          <li><strong>Élite</strong> — 14,99 € / mois ou 119 € / an : 150 candidatures IA par mois, sans engagement, résiliable à tout moment.</li>
          <li><strong>Packs de candidatures</strong> (achat unique, crédits sans date d'expiration) : Découverte — 10 candidatures pour 7,99 € ; Booster — 30 candidatures pour 19,99 € ; Marathon — 100 candidatures pour 49,99 €.</li>
        </ul>
        <p className="mt-2">Les prix en vigueur sont ceux affichés sur la page Tarifs au moment de la commande.</p>
      </>
    ),
  },
  {
    heading: '2. Paiement',
    body: (
      <p>
        Les paiements sont traités de façon sécurisée par <strong>Stripe</strong>. L'abonnement est reconduit
        automatiquement à chaque période jusqu'à résiliation par l'utilisateur.
      </p>
    ),
  },
  {
    heading: '3. Droit de rétractation',
    body: (
      <p>
        Conformément à l'article L221-18 du Code de la consommation, vous disposez d'un délai de 14 jours à
        compter de la souscription pour vous rétracter, par simple e-mail à l'adresse de contact. L'accès au
        service étant fourni immédiatement après le paiement, l'exécution commence avant la fin de ce délai à
        votre demande ; en cas de rétractation, le remboursement est alors effectué déduction faite de la valeur
        du service déjà consommé (candidatures IA générées), conformément à l'article L221-25 du Code de la
        consommation.
      </p>
    ),
  },
  {
    heading: '4. Résiliation et remboursement',
    body: (
      <p>
        L'abonnement Élite est sans engagement et peut être résilié à tout moment ; il reste actif jusqu'à la fin
        de la période en cours (mois ou année), qui n'est pas remboursée en dehors du droit de rétractation
        ci-dessus. Les crédits de packs non consommés peuvent être remboursés sur demande dans les 14 jours
        suivant l'achat, au prorata des candidatures non utilisées.
      </p>
    ),
  },
  {
    heading: '5. Réclamations et médiation',
    body: (
      <p>
        Toute réclamation peut être adressée à <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#7D5CFF] font-bold hover:underline">{CONTACT_EMAIL}</a>. Conformément à l'article L612-1 du
        Code de la consommation, le consommateur peut recourir gratuitement à un médiateur de la consommation :{' '}
        <TODO>[Adhésion en cours auprès de CM2C (cm2c.net) — les coordonnées complètes du médiateur seront
        publiées ici dès validation de l'adhésion.]</TODO>
      </p>
    ),
  },
];

const PAGES: Record<string, { title: string; intro: string; sections: Section[] }> = {
  mentions: {
    title: 'Mentions légales',
    intro: "Informations relatives à l'éditeur et à l'hébergement du site Joboost.",
    sections: mentionsLegales,
  },
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: 'Comment Joboost collecte, utilise et protège vos données personnelles, conformément au RGPD.',
    sections: confidentialite,
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    intro: "Règles d'accès et d'utilisation du service Joboost.",
    sections: cgu,
  },
  cgv: {
    title: 'Conditions générales de vente',
    intro: 'Conditions applicables aux abonnements payants Joboost.',
    sections: cgv,
  },
};

const TABS = [
  { key: 'mentions', label: 'Mentions légales' },
  { key: 'confidentialite', label: 'Confidentialité' },
  { key: 'cgu', label: 'CGU' },
  { key: 'cgv', label: 'CGV' },
];

const Legal: React.FC = () => {
  const { page } = useParams<{ page: string }>();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page]);

  if (!page || !PAGES[page]) {
    return <Navigate to="/legal/mentions" replace />;
  }

  const current = PAGES[page];

  return (
    <div className="min-h-screen bg-white dark:bg-[#030712] text-slate-900 dark:text-slate-100">
      {/* Header */}
      <nav className="border-b border-slate-100 dark:border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-[#7D5CFF] transition-colors text-sm font-bold"
          >
            <ArrowLeft size={16} /> Retour à l'accueil
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D5CFF]/5 dark:bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#A78BFA] text-[10px] font-black uppercase tracking-[0.2em] border border-[#7D5CFF]/15 dark:border-[#7D5CFF]/20 mb-6">
          <ShieldCheck size={14} /> Informations légales
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">{current.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">{current.intro}</p>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">
          Dernière mise à jour : {LAST_UPDATE}
        </p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-12 border-b border-slate-100 dark:border-slate-800 pb-4">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={`/legal/${t.key}`}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                page === t.key
                  ? 'bg-[#7D5CFF] text-white shadow-lg shadow-[#7D5CFF]/20 dark:shadow-none'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-[#7D5CFF]'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {current.sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{s.heading}</h2>
              <div className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium space-y-2">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 leading-relaxed">
          Ces documents constituent une base de conformité. Les éléments surlignés restent à compléter par
          l'éditeur et il est recommandé de les faire valider par un professionnel du droit avant la mise en ligne
          définitive.
        </div>
      </div>
    </div>
  );
};

export default Legal;
