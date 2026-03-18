export interface Race {
  id: number;
  nom: string;
}

export interface ConfigPoids {
  id: number;
  race_id: number;
  race_nom: string;
  semaine: number;
  poids_cumule: number;
  variation: number | null;
  nourriture_jour: number;
}

export interface ConfigPrix {
  id: number;
  race_id: number;
  race_nom: string;
  prix_achat_tete: number;
  prix_vente_gramme: number;
  prix_nourriture_gramme: number;
  prix_oeuf: number;
  nb_jour_eclosion: number;
}

export interface Lot {
  id: number;
  nom: string;
  date_entree: string;
  nombre: number;
  race_id: number;
  race_nom: string;
  age_entree_semaine: number;
  poids_initial: number;
  source: string;
}

export interface Mortalite {
  id: number;
  lot_id: number;
  lot_nom: string;
  date_mortalite: string;
  nombre: number;
  nombre_morts_males?: number;
  nombre_morts_femelles?: number;
  pct_morts_males?: number;
  pct_morts_femelles?: number;
}

export interface Oeuf {
  id: number;
  date_reception: string;
  race_id: number;
  race_nom: string;
  nombre: number;
}

export interface StockOeuf {
  race_id: number;
  race_nom: string;
  total_recus: number;
  total_transformes: number;
  stock_disponible: number;
}

export interface Transformation {
  id: number;
  date_transformation: string;
  race_id: number;
  race_nom: string;
  oeufs_transformes: number;
  nouveaux_poussins: number;
  lot_id: number;
  lot_nom: string;
}

export interface StockItem {
  lot_id: number;
  lot_nom: string;
  race_nom: string;
  source: string;
  date_entree: string;
  nombre_initial: number;
  poulets_vivants: number;
  total_morts: number;
  stock_oeufs: number;
  age_entree: string;
  semaine_actuelle: string;
  poids_initial: number;
  poids_moyen: number;
  nourriture_jour_g: number;
  nourriture_semaine_g: number;
  nourriture_mois_g: number;
  nourriture_total_g: number;
  cout_nourriture_jour: number;
  cout_nourriture_semaine: number;
  cout_nourriture_mois: number;
  cout_nourriture_total: number;
  prix_achat_lot: number;
  depenses_jour: number;
  depenses_semaine: number;
  depenses_mois: number;
  depenses_total: number;
  valeur_vente: number;
  ca_jour: number;
  ca_semaine: number;
  ca_mois: number;
  ca_total: number;
  benefice_jour: number;
  benefice_semaine: number;
  benefice_mois: number;
  benefice_total: number;
  estimation_valeur_poulet: number;
  estimation_valeur_oeufs: number;
  estimation_valeur_oeufs_pourris?: number;
}
