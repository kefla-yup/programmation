const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET poids du poulet
// Query params: race_id, date_debut (YYYY-MM-DD), date_fin (YYYY-MM-DD)
router.get('/', async (req, res) => {
    try {
        const { race_id, date_debut, date_fin } = req.query;
        if (!race_id || !date_debut || !date_fin) {
            return res.status(400).json({ error: 'Paramètres requis: race_id, date_debut, date_fin' });
        }

        const pool = await getPool();

        // Récupérer config poids pour la race
        const configResult = await pool.request()
            .input('race_id', sql.Int, race_id)
            .query('SELECT semaine, poids_cumule FROM config_poids WHERE race_id = @race_id ORDER BY semaine');
        const configPoids = configResult.recordset;

        if (configPoids.length === 0) {
            return res.status(404).json({ error: 'Aucune configuration de poids pour cette race' });
        }

        // Récupérer le nom de la race
        const raceResult = await pool.request()
            .input('race_id', sql.Int, race_id)
            .query('SELECT nom FROM race WHERE id = @race_id');
        const raceNom = raceResult.recordset.length > 0 ? raceResult.recordset[0].nom : 'Inconnue';

        // Construire les poids cumulés réels (somme progressive des gains)
        const sortedConfig = [...configPoids].sort((a, b) => a.semaine - b.semaine);
        const cumulatedWeights = new Map();
        let runningSum = 0;
        for (const cp of sortedConfig) {
            runningSum += parseFloat(cp.poids_cumule);
            cumulatedWeights.set(cp.semaine, runningSum);
        }

        const maxSemaineConfig = Math.max(...configPoids.map(c => c.semaine));
        const lastCumulatedWeight = cumulatedWeights.get(maxSemaineConfig) || 0;

        function getCumulatedWeight(semaine) {
            if (cumulatedWeights.has(semaine)) return cumulatedWeights.get(semaine);
            let best = 0, bestVal = 0;
            for (const [s, w] of cumulatedWeights) {
                if (s <= semaine && s >= best) { best = s; bestVal = w; }
            }
            return bestVal;
        }

        const dateDebut = new Date(date_debut);
        const dateFin = new Date(date_fin);
        const diffJours = Math.floor((dateFin - dateDebut) / (24 * 60 * 60 * 1000));

        if (diffJours < 0) {
            return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
        }

        // S0 = premier jour de S1
        // Semaine fractionnelle depuis le début
        const fractionalWeeks = diffJours / 7;
        const semaineActuelle = Math.min(Math.ceil(fractionalWeeks) || 0, maxSemaineConfig);

        let poids;
        if (fractionalWeeks <= maxSemaineConfig) {
            const weekLower = Math.min(Math.floor(fractionalWeeks), maxSemaineConfig);
            const weekUpper = Math.min(weekLower + 1, maxSemaineConfig);
            const fractionInWeek = fractionalWeeks - Math.floor(fractionalWeeks);
            const poidsLower = getCumulatedWeight(weekLower);
            const poidsUpper = getCumulatedWeight(weekUpper);
            poids = poidsLower + (poidsUpper - poidsLower) * fractionInWeek;
        } else {
            poids = lastCumulatedWeight;
        }

        poids = Math.round(poids * 1000) / 1000;

        res.json({
            race_id: Number(race_id),
            race_nom: raceNom,
            date_debut: date_debut,
            date_fin: date_fin,
            jours_ecoules: diffJours,
            semaine: `S${semaineActuelle}`,
            poids_gramme: poids
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
