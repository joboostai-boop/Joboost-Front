// ====================================================================
//  Petit cache mémoire à durée de vie (TTL), sans dépendance.
//
//  Sert à ne pas réinterroger France Travail / Adzuna / geo.api.gouv.fr pour
//  une recherche identique faite il y a quelques minutes (mesuré le 06/10/2026 :
//  ~1,3 s par recherche d'offres, refaite à chaque ouverture de la page).
//  Les appels identiques EN COURS sont aussi mutualisés (une seule requête
//  externe même si plusieurs visiteurs demandent la même chose en même temps).
//  Le cache vit dans le processus : il repart à vide à chaque redémarrage.
// ====================================================================

export class TtlCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();
  private inflight = new Map<string, Promise<T>>();

  constructor(private ttlMs: number, private maxEntries = 500) {}

  /** Renvoie la valeur en cache, sinon exécute `load` et mémorise son résultat. */
  async get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const p = load()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  set(key: string, value: T): void {
    if (this.store.size >= this.maxEntries) {
      // Éviction simple : la plus ancienne entrée insérée part en premier.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
