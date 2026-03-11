const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET vue stock avec calculs automatiques
// Query param: ?date=2026-03-01 (date de consultation)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const dateConsultation = req.query.date || new Date().toISOString().split('T')[0];

        // Récupérer tous les lots
        const lotsResult = await pool.request()
            .input('dateConsultation', sql.Date, dateConsultation)
            .query(`
                SELECT l.*, r.nom as race_nom
                FROM lot l
                JOIN race r ON l.race_id = r.id
                WHERE l.date_entree <= @dateConsultation
                ORDER BY l.date_entree
            `);

        const lots = lotsResult.recordset;
        const stockData = [];

        for (const lot of lots) {
            // Calculer semaines écoulées
            // Jour d'entrée = S0, dès le lendemain = début S1
            const dateEntree = new Date(lot.date_entree);
            const dateCons = new Date(dateConsultation);
            const diffJours = Math.floor((dateCons - dateEntree) / (24 * 60 * 60 * 1000));
            const semainesEcoulees = diffJours > 0 ? Math.ceil(diffJours / 7) : 0;
            const semaineActuelleReel = lot.age_entree_semaine + semainesEcoulees;

            // Récupérer config poids pour la race
            const configResult = await pool.request()
                .input('race_id_' + lot.id, sql.Int, lot.race_id)
                .query(`
                    SELECT semaine, poids_cumule, variation, nourriture_jour
                    FROM config_poids
                    WHERE race_id = @race_id_${lot.id}
                    ORDER BY semaine
                `);
            const configPoids = configResult.recordset;

            // Construire les poids cumulés réels (somme progressive des gains)
            // poids_cumule dans la BDD = gain de la semaine, le vrai poids = somme de S0 à SN
            const sortedConfig = [...configPoids].sort((a, b) => a.semaine - b.semaine);
            const cumulatedWeights = new Map(); // semaine -> poids réel cumulé
            let runningSum = 0;
            for (const cp of sortedConfig) {
                runningSum += parseFloat(cp.poids_cumule);
                cumulatedWeights.set(cp.semaine, runningSum);
            }

            // Calculer poids moyen actuel
            let poidsMoyen = lot.poids_initial;
            const maxSemaineConfig = configPoids.length > 0
                ? Math.max(...configPoids.map(c => c.semaine))
                : 0;

            // Plafonner la semaine actuelle à la semaine max configurée
            const semaineActuelle = Math.min(semaineActuelleReel, maxSemaineConfig);

            const lastCumulatedWeight = cumulatedWeights.get(maxSemaineConfig) || 0;

            // Fonction pour obtenir le poids cumulé réel à une semaine donnée
            function getCumulatedWeight(semaine) {
                if (cumulatedWeights.has(semaine)) return cumulatedWeights.get(semaine);
                // Chercher la semaine config la plus proche en dessous
                let best = 0, bestVal = 0;
                for (const [s, w] of cumulatedWeights) {
                    if (s <= semaine && s >= best) { best = s; bestVal = w; }
                }
                return bestVal;
            }

            // Semaine réelle (fractionnelle) depuis l'entrée
            const fractionalWeeks = diffJours / 7;
            const semaineReelle = lot.age_entree_semaine + fractionalWeeks;

            let poidsMoyenExact;
            if (semaineReelle <= maxSemaineConfig) {
                // Dans la plage config : interpolation linéaire avec poids cumulés
                const weekLower = Math.min(Math.floor(fractionalWeeks) + lot.age_entree_semaine, maxSemaineConfig);
                const weekUpper = Math.min(weekLower + 1, maxSemaineConfig);
                const fractionInWeek = fractionalWeeks - Math.floor(fractionalWeeks);
                const poidsLower = getCumulatedWeight(weekLower);
                const poidsUpper = getCumulatedWeight(weekUpper);
                poidsMoyenExact = poidsLower + (poidsUpper - poidsLower) * fractionInWeek;
            } else {
                // Au-delà de la config : plafonner au dernier poids configuré
                poidsMoyenExact = lastCumulatedWeight;
            }
            poidsMoyen = poidsMoyenExact;
            
            // Arrondir le poids à 2 décimales pour les calculs financiers
            const poidsMoyenArrondi = Math.round(poidsMoyenExact * 100) / 100;

            // Récupérer total morts pour ce lot jusqu'à la date de consultation
            const mortsResult = await pool.request()
                .input('lot_id_' + lot.id, sql.Int, lot.id)
                .input('date_cons_' + lot.id, sql.Date, dateConsultation)
                .query(`
                    SELECT ISNULL(SUM(nombre), 0) as total_morts
                    FROM mortalite
                    WHERE lot_id = @lot_id_${lot.id} AND date_mortalite <= @date_cons_${lot.id}
                `);
            const totalMorts = mortsResult.recordset[0].total_morts;
            const pouletsVivants = lot.nombre - totalMorts;

            // Nourriture journalière par poulet = variation (nourriture hebdo) / 7
            // S0 = naissance, pas de nourriture
            function getNourritureJourConfig(semaine) {
                const conf = configPoids.find(c => c.semaine === semaine);
                if (!conf) return 0;
                const variation = parseFloat(conf.variation) || 0;
                return variation / 7;
            }

            const currentConfigWeek = diffJours <= 0
                ? lot.age_entree_semaine
                : Math.min(Math.ceil(diffJours / 7) + lot.age_entree_semaine, maxSemaineConfig);
            const nourritureJourParPouletExact = currentConfigWeek === 0 ? 0 : getNourritureJourConfig(currentConfigWeek);

            const nourritureJour = nourritureJourParPouletExact * pouletsVivants;
            const nourritureSemaine = nourritureJour * 7;
            const nourritureMois = nourritureJour * 30;

            // Récupérer les mortalités détaillées par date pour calcul jour par jour
            const mortalitesDetailResult = await pool.request()
                .input('lot_mort_detail_' + lot.id, sql.Int, lot.id)
                .input('date_mort_detail_' + lot.id, sql.Date, dateConsultation)
                .query(`
                    SELECT date_mortalite, nombre
                    FROM mortalite
                    WHERE lot_id = @lot_mort_detail_${lot.id} AND date_mortalite <= @date_mort_detail_${lot.id}
                    ORDER BY date_mortalite
                `);
            const mortalitesDetail = mortalitesDetailResult.recordset;

            // Calculer nourriture totale consommée jour par jour en tenant compte de la mortalité
            let nourritureTotal = 0;
            for (let j = 1; j <= diffJours; j++) {
                const weekForDay = Math.min(Math.ceil(j / 7) + lot.age_entree_semaine, maxSemaineConfig);
                // S0 = pas de nourriture
                if (weekForDay === 0) continue;

                // Calculer le nombre de poulets vivants ce jour-là
                const jourDate = new Date(dateEntree);
                jourDate.setDate(jourDate.getDate() + j);
                let mortsAuJour = 0;
                for (const m of mortalitesDetail) {
                    if (new Date(m.date_mortalite) <= jourDate) {
                        mortsAuJour += m.nombre;
                    }
                }
                const vivantsJour = lot.nombre - mortsAuJour;

                const nj = getNourritureJourConfig(weekForDay);
                nourritureTotal += nj * vivantsJour;
            }

            // Récupérer config prix
            const prixResult = await pool.request()
                .input('race_prix_' + lot.id, sql.Int, lot.race_id)
                .query(`
                    SELECT * FROM config_prix WHERE race_id = @race_prix_${lot.id}
                `);
            const configPrix = prixResult.recordset.length > 0 ? prixResult.recordset[0] : null;

            // Stock oeufs pour cette race
            const oeufsStockResult = await pool.request()
                .input('race_oeufs_' + lot.id, sql.Int, lot.race_id)
                .query(`
                    SELECT
                        ISNULL((SELECT SUM(nombre) FROM oeuf WHERE race_id = @race_oeufs_${lot.id}), 0)
                        - ISNULL((SELECT SUM(oeufs_transformes) FROM transformation WHERE race_id = @race_oeufs_${lot.id}), 0)
                        as stock_oeufs
                `);
            const stockOeufs = oeufsStockResult.recordset[0].stock_oeufs;

            // Poids à l'entrée (utiliser config cumulé si poids_initial du lot est 0)
            let poidsEntree = lot.poids_initial > 0
                ? lot.poids_initial
                : (getCumulatedWeight(lot.age_entree_semaine) || 0);

            // Si achat direct et poids = 0 (poussins), utiliser le premier poids cumulé non-nul
            if (lot.source !== 'transformation' && poidsEntree === 0 && sortedConfig.length > 0) {
                const premierPoidsCumule = sortedConfig
                    .filter(c => parseFloat(c.poids_cumule) > 0)
                    .map(c => c.semaine)[0];
                if (premierPoidsCumule !== undefined) {
                    poidsEntree = getCumulatedWeight(premierPoidsCumule);
                }
            }

            // Calculs financiers
            const prixAchatGramme = configPrix ? parseFloat(configPrix.prix_achat_gramme) : 0;

            // Prix d'achat fixe (coût unique au moment de l'achat, ne change jamais)
            // Basé sur poids_initial stocké en BDD au moment de la création du lot
            let prixAchatLot;
            if (lot.source === 'transformation') {
                prixAchatLot = 0;
            } else if (lot.poids_initial > 0) {
                prixAchatLot = prixAchatGramme * lot.poids_initial * lot.nombre;
            } else {
                // Poussins (poids = 0) : prix par unité
                prixAchatLot = prixAchatGramme * lot.nombre;
            }

            const valeurVente = configPrix
                ? pouletsVivants * poidsMoyenArrondi * parseFloat(configPrix.prix_vente_gramme)
                : 0;
            const prixNourritureGramme = configPrix ? parseFloat(configPrix.prix_nourriture_gramme || 0) : 0;
            const coutNourritureJour = nourritureJour * prixNourritureGramme;
            const coutNourritureSemaine = nourritureSemaine * prixNourritureGramme;
            const coutNourritureMois = nourritureMois * prixNourritureGramme;
            const coutNourritureTotal = nourritureTotal * prixNourritureGramme;

            // Chiffre d'affaires = valeur marchande actuelle (snapshot: si on vendait tout aujourd'hui)
            const prixVenteGramme = configPrix ? parseFloat(configPrix.prix_vente_gramme) : 0;
            const ca = pouletsVivants * poidsMoyenArrondi * prixVenteGramme;

            // Dépenses = prix achat + coût nourriture par période
            const depensesJour = prixAchatLot + coutNourritureJour;
            const depensesSemaine = prixAchatLot + coutNourritureSemaine;
            const depensesMois = prixAchatLot + coutNourritureMois;
            const depensesTotal = prixAchatLot + coutNourritureTotal;

            // Bénéfice = CA (valeur marché) - dépenses totales (prix achat + nourriture)
            const beneficeJour = ca - depensesJour;
            const beneficeSemaine = ca - depensesSemaine;
            const beneficeMois = ca - depensesMois;
            const beneficeTotal = ca - depensesTotal;

            stockData.push({
                lot_id: lot.id,
                lot_nom: lot.nom,
                race_nom: lot.race_nom,
                source: lot.source,
                date_entree: lot.date_entree,
                nombre_initial: lot.nombre,
                poulets_vivants: pouletsVivants,
                total_morts: totalMorts,
                stock_oeufs: stockOeufs,
                age_entree: `S${lot.age_entree_semaine}`,
                semaine_actuelle: `S${semaineActuelle}`,
                poids_initial: lot.poids_initial,
                poids_moyen: poidsMoyen,
                nourriture_jour_g: Math.round(nourritureJour),
                nourriture_semaine_g: Math.round(nourritureSemaine),
                nourriture_mois_g: Math.round(nourritureMois),
                nourriture_total_g: Math.round(nourritureTotal),
                cout_nourriture_jour: coutNourritureJour,
                cout_nourriture_semaine: coutNourritureSemaine,
                cout_nourriture_mois: coutNourritureMois,
                cout_nourriture_total: coutNourritureTotal,
                prix_achat_lot: prixAchatLot,
                depenses_jour: depensesJour,
                depenses_semaine: depensesSemaine,
                depenses_mois: depensesMois,
                depenses_total: depensesTotal,
                valeur_vente: valeurVente,
                ca_jour: ca,
                ca_semaine: ca,
                ca_mois: ca,
                ca_total: ca,
                benefice_jour: beneficeJour,
                benefice_semaine: beneficeSemaine,
                benefice_mois: beneficeMois,
                benefice_total: beneficeTotal,
                estimation_valeur_poulet: pouletsVivants * poidsMoyenArrondi * prixVenteGramme,
                estimation_valeur_oeufs: stockOeufs * (configPrix ? parseFloat(configPrix.prix_oeuf) : 0)
            });
        }

        res.json(stockData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
