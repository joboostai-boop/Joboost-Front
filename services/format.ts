/* ════════════════════════════════════════════════════════════════════
   Formatage d'affichage partagé (montée en gamme « finition »).
   Nettoie les chaînes brutes renvoyées par les API d'offres.
   ════════════════════════════════════════════════════════════════════ */

/**
 * Nettoie un libellé de salaire brut type
 * « Annuel de 30000.0 Euros à 35000.0 Euros sur 12.0 mois »
 * → « Annuel de 30 000 € à 35 000 € sur 12 mois ».
 * Toujours sûr : en cas d'entrée inattendue, renvoie la chaîne d'origine.
 */
export function formatSalary(raw?: string | null): string {
  if (!raw) return '';
  try {
    let s = String(raw);
    // « 30000.0 » → « 30000 », « 12.0 » → « 12 » (décimales à zéro inutiles)
    s = s.replace(/(\d+)[.,]0+(?!\d)/g, '$1');
    // « Euros » / « Euro » / « EUR » → « € »
    s = s.replace(/\bEuros?\b/gi, '€').replace(/\bEUR\b/g, '€');
    // Séparateur de milliers sur les entiers de 4 chiffres et + : 30000 → 30 000
    s = s.replace(/\d{4,}/g, (n) => Number(n).toLocaleString('fr-FR'));
    // Espaces multiples éventuels
    s = s.replace(/\s{2,}/g, ' ').trim();
    return s || String(raw);
  } catch {
    return String(raw);
  }
}
