import dns from 'dns/promises';

// ====================================================================
//  Garde anti-SSRF : ce service récupère des URLs arbitraires côté serveur.
//  Sans contrôle, un appelant pourrait viser des ressources internes
//  (169.254.169.254 métadonnées cloud, 127.0.0.1, réseau privé…).
//  On n'autorise donc que http(s) vers des adresses IP publiques.
// ====================================================================

export class ScrapeError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'ScrapeError';
  }
}

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = n * 256 + o;
  }
  return n >>> 0;
};

const inV4Range = (ipInt: number, cidr: string): boolean => {
  const [base, bitsStr] = cidr.split('/');
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
};

// Plages IPv4 non routables / sensibles à bloquer.
const PRIVATE_V4 = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10', // CGNAT
  '127.0.0.0/8',
  '169.254.0.0/16', // link-local + métadonnées cloud
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // réservé
];

const isPrivateIp = (ip: string): boolean => {
  // IPv6
  if (ip.includes(':')) {
    const low = ip.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fe80') || low.startsWith('fc') || low.startsWith('fd')) return true;
    // IPv4 mappée (::ffff:a.b.c.d)
    const mapped = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return true; // illisible → on bloque par prudence
  return PRIVATE_V4.some((cidr) => inV4Range(ipInt, cidr));
};

/**
 * Valide qu'une URL est http(s) et que son hôte résout vers une IP publique.
 * Lève ScrapeError sinon. Renvoie l'URL normalisée.
 */
export const assertSafeUrl = async (rawUrl: string): Promise<string> => {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new ScrapeError('invalid_url');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new ScrapeError('invalid_protocol');
  }
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new ScrapeError('blocked_host');
  }
  // Si l'hôte est déjà une IP littérale, on la teste directement.
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isPrivateIp(host)) throw new ScrapeError('blocked_private_ip');
    return u.toString();
  }
  // Sinon on résout le DNS et on vérifie TOUTES les adresses retournées.
  let records: { address: string }[];
  try {
    records = await dns.lookup(host, { all: true });
  } catch {
    throw new ScrapeError('dns_failed');
  }
  if (records.length === 0) throw new ScrapeError('dns_empty');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new ScrapeError('blocked_private_ip');
  }
  return u.toString();
};
