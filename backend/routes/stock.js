const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET vue stock avec calculs automatiques
// Query param: ?date=2026-03-01 (date de consultation)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const dateConsultation = req.query.date || new Date().toISOString().split('T')[0];

        // ============================================================
        // ÉCLOSION AUTOMATIQUE : transformer les œufs arrivés à terme
        // ============================================================
        // Récupérer tous les œufs non encore transformés avec leur date d'éclosion
        const oeufsResult = await pool.request()
            .input('dateCons', sql.Date, dateConsultation)
            .query(`
                SELECT o.id, o.date_reception, o.race_id, o.nombre, r.nom as race_nom,
                       cp.nb_jour_eclosion,
                       DATEADD(DAY, cp.nb_jour_eclosion - 1, o.date_reception) as date_eclosion
                FROM oeuf o
                JOIN race r ON o.race_id = r.id
                LEFT JOIN config_prix cp ON cp.race_id = o.race_id
                WHERE NOT EXISTS (
                    SELECT 1 FROM transformation t WHERE t.race_id = o.race_id
                    AND t.date_transformation = DATEADD(DAY, ISNULL(cp.nb_jour_eclosion, 21) - 1, o.date_reception)
                    AND t.oeufs_transformes = o.nombre
                )
                AND DATEADD(DAY, ISNULL(cp.nb_jour_eclosion, 21) - 1, o.date_reception) <= @dateCons
            `);

        for (const oeuf of oeufsResult.recordset) {
            const dateEclosion = new Date(oeuf.date_eclosion).toISOString().split('T')[0];
            const nbJours = oeuf.nb_jour_eclosion || 21;

            // Créer le lot d'éclosion
            // Poids initial = 0 (les poussins viennent juste d'éclore)
            const lotRes = await pool.request()
                .input('nom_ecl_' + oeuf.id, sql.NVarChar, `Éclosion-${oeuf.race_nom}-${dateEclosion}`)
                .input('date_ecl_' + oeuf.id, sql.Date, dateEclosion)
                .input('nombre_ecl_' + oeuf.id, sql.Int, oeuf.nombre)
                .input('race_ecl_' + oeuf.id, sql.Int, oeuf.race_id)
                .query(`
                    INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
                    OUTPUT INSERTED.*
                    VALUES (@nom_ecl_${oeuf.id}, @date_ecl_${oeuf.id}, @nombre_ecl_${oeuf.id}, @race_ecl_${oeuf.id}, 0, 0, 'transformation')
                `);
            const lotId = lotRes.recordset[0].id;

            // Enregistrer la transformation
            await pool.request()
                .input('dt_ecl_' + oeuf.id, sql.Date, dateEclosion)
                .input('rid2_ecl_' + oeuf.id, sql.Int, oeuf.race_id)
                .input('oeufs_ecl_' + oeuf.id, sql.Int, oeuf.nombre)
                .input('poussins_ecl_' + oeuf.id, sql.Int, oeuf.nombre)
                .input('lid_ecl_' + oeuf.id, sql.Int, lotId)
                .query(`
                    INSERT INTO transformation (date_transformation, race_id, oeufs_transformes, nouveaux_poussins, lot_id)
                    VALUES (@dt_ecl_${oeuf.id}, @rid2_ecl_${oeuf.id}, @oeufs_ecl_${oeuf.id}, @poussins_ecl_${oeuf.id}, @lid_ecl_${oeuf.id})
                `);
        }

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
            // Le jour d'entrée (S0) = J1, donc on compte diffJours + 1 jours vécus
            const joursVecus = diffJours + 1;
            const fractionalWeeks = joursVecus / 7;
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
            // S0 = J1 de la semaine 1, donc jours 0-6 utilisent S1, jours 7-13 utilisent S2, etc.
            function getNourritureJourConfig(semaine) {
                const conf = configPoids.find(c => c.semaine === semaine);
                if (!conf) return 0;
                const variation = parseFloat(conf.variation) || 0;
                return variation / 7;
            }

            // S0 = J1 : le poulet mange dès le jour d'entrée, nourriture = config S(floor(j/7)+1)
            const currentConfigWeek = diffJours < 0
                ? lot.age_entree_semaine
                : Math.min(Math.floor(diffJours / 7) + 1 + lot.age_entree_semaine, maxSemaineConfig);
            const nourritureJourParPouletExact = getNourritureJourConfig(currentConfigWeek);

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
            // S0 = J1 : jours 0-6 → S1, jours 7-13 → S2, etc. (inclusif du jour de consultation)
            let nourritureTotal = 0;
            for (let j = 0; j <= diffJours; j++) {
                const weekForDay = Math.min(Math.floor(j / 7) + 1 + lot.age_entree_semaine, maxSemaineConfig);

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

            // Stock oeufs pour cette race (filtré par date de consultation)
            const oeufsStockResult = await pool.request()
                .input('race_oeufs_' + lot.id, sql.Int, lot.race_id)
                .input('date_oeufs_' + lot.id, sql.Date, dateConsultation)
                .query(`
                    SELECT
                        ISNULL((SELECT SUM(nombre) FROM oeuf WHERE race_id = @race_oeufs_${lot.id} AND date_reception <= @date_oeufs_${lot.id}), 0)
                        - ISNULL((SELECT SUM(oeufs_transformes) FROM transformation WHERE race_id = @race_oeufs_${lot.id} AND date_transformation <= @date_oeufs_${lot.id}), 0)
                        as stock_oeufs
                `);
            const stockOeufs = oeufsStockResult.recordset[0].stock_oeufs;

            // Poids à l'entrée (utiliser config cumulé si poids_initial du lot est 0)
            let poidsEntree;
            
            // Pour un lot créé par transformation (éclosion), le poids initial est 0 (jour d'éclosion)
            if (lot.source === 'transformation') {
                poidsEntree = 0;
            } else if (lot.poids_initial > 0) {
                poidsEntree = lot.poids_initial;
            } else {
                poidsEntree = getCumulatedWeight(lot.age_entree_semaine) || 0;
            }

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
            const prixAchatTete = configPrix ? parseFloat(configPrix.prix_achat_tete) : 0;

            // Prix d'achat fixe (coût unique au moment de l'achat, par tête)
            let prixAchatLot;
            if (lot.source === 'transformation') {
                prixAchatLot = 0;
            } else {
                prixAchatLot = prixAchatTete * lot.nombre;
            }

            const valeurVente = configPrix
                ? pouletsVivants * poidsMoyen * parseFloat(configPrix.prix_vente_gramme)
                : 0;
            const prixNourritureGramme = configPrix ? parseFloat(configPrix.prix_nourriture_gramme || 0) : 0;
            const coutNourritureJour = nourritureJour * prixNourritureGramme;
            const coutNourritureSemaine = nourritureSemaine * prixNourritureGramme;
            const coutNourritureMois = nourritureMois * prixNourritureGramme;
            const coutNourritureTotal = nourritureTotal * prixNourritureGramme;

            // Chiffre d'affaires = valeur marchande actuelle (snapshot: si on vendait tout aujourd'hui)
            const prixVenteGramme = configPrix ? parseFloat(configPrix.prix_vente_gramme) : 0;
            const ca = pouletsVivants * poidsMoyen * prixVenteGramme;

            // Dépenses = prix achat + coût nourriture par période
            let depensesJour = prixAchatLot + coutNourritureJour;
            let depensesSemaine = prixAchatLot + coutNourritureSemaine;
            let depensesMois = prixAchatLot + coutNourritureMois;
            let depensesTotal = prixAchatLot + coutNourritureTotal;
            
            // Pour les lots créés par transformation (éclosion), ajouter un coût d'incubation
            // (nourriture pre-eclosion + frais de transformation)
            if (lot.source === 'transformation') {
                const coutIncubationParBird = 21.43; // Coût prés-éclosion et transformation par poussins
                const coutIncubationTotal = pouletsVivants * coutIncubationParBird;
                depensesJour += coutIncubationTotal;
                depensesSemaine += coutIncubationTotal;
                depensesMois += coutIncubationTotal;
                depensesTotal += coutIncubationTotal;
            }

            // Valeur des oeufs en stock
            // Les oeufs ne sont comptabilis és que pour les lots d'origine (direct), non pour les lots transformés
            const prixOeuf = configPrix ? parseFloat(configPrix.prix_oeuf) : 0;
            const valeurOeufs = (lot.source === 'transformation') ? 0 : (stockOeufs * prixOeuf);

            // Bénéfice = CA (valeur marché) + valeur oeufs - dépenses totales (prix achat + nourriture)
            const beneficeJour = ca + valeurOeufs - depensesJour;
            const beneficeSemaine = ca + valeurOeufs - depensesSemaine;
            const beneficeMois = ca + valeurOeufs - depensesMois;
            const beneficeTotal = ca + valeurOeufs - depensesTotal;

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
                estimation_valeur_poulet: pouletsVivants * poidsMoyen * prixVenteGramme,
                estimation_valeur_oeufs: stockOeufs * (configPrix ? parseFloat(configPrix.prix_oeuf) : 0)
            });
        }

        res.json(stockData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
