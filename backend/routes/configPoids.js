const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// Calcul automatique nourriture/jour = variation (nourriture hebdo) / 7
function calcNourritureJour(variation) {
    if (!variation || variation <= 0) return 0;
    return Math.round((variation / 7) * 100) / 100;
}

// GET config poids (optionnel: filtrer par race_id)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        let query = `
            SELECT cp.*, r.nom as race_nom
            FROM config_poids cp
            JOIN race r ON cp.race_id = r.id
        `;
        const request = pool.request();
        if (req.query.race_id) {
            query += ' WHERE cp.race_id = @race_id';
            request.input('race_id', sql.Int, req.query.race_id);
        }
        query += ' ORDER BY r.nom, cp.semaine';
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET poids cumulé pour une race et une semaine
router.get('/poids/:raceId/:semaine', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('race_id', sql.Int, req.params.raceId)
            .input('semaine', sql.Int, req.params.semaine)
            .query(`
                SELECT poids_cumule FROM config_poids
                WHERE race_id = @race_id AND semaine = @semaine
            `);
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Configuration non trouvée' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST ajouter une config poids (nourriture_jour auto-calculée = poids_cumule / 7)
router.post('/', async (req, res) => {
    try {
        const { race_id, semaine, poids_cumule, variation } = req.body;
        const pool = await getPool();
        // S0 = naissance : variation = 0, nourriture = 0
        const isSemaine0 = parseInt(semaine) === 0;
        const variationVal = isSemaine0 ? 0 : (variation || null);
        const nourriture_auto = isSemaine0 ? 0 : calcNourritureJour(variationVal);
        const result = await pool.request()
            .input('race_id', sql.Int, race_id)
            .input('semaine', sql.Int, semaine)
            .input('poids_cumule', sql.Decimal(10, 2), poids_cumule)
            .input('variation', sql.Decimal(10, 2), variationVal)
            .input('nourriture_jour', sql.Decimal(10, 2), nourriture_auto)
            .query(`
                INSERT INTO config_poids (race_id, semaine, poids_cumule, variation, nourriture_jour)
                OUTPUT INSERTED.*
                VALUES (@race_id, @semaine, @poids_cumule, @variation, @nourriture_jour)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une config poids (nourriture_jour auto-calculée = poids_cumule / 7)
router.put('/:id', async (req, res) => {
    try {
        let { semaine, poids_cumule, variation } = req.body;
        const pool = await getPool();
        // Si semaine pas fournie, la lire depuis la BDD
        if (semaine === undefined || semaine === null) {
            const existing = await pool.request()
                .input('id_check', sql.Int, req.params.id)
                .query('SELECT semaine FROM config_poids WHERE id = @id_check');
            semaine = existing.recordset.length > 0 ? existing.recordset[0].semaine : -1;
        }
        // S0 = naissance : variation = 0, nourriture = 0
        const isSemaine0 = parseInt(semaine) === 0;
        const variationVal = isSemaine0 ? 0 : (variation || null);
        const nourriture_auto = isSemaine0 ? 0 : calcNourritureJour(variationVal);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('poids_cumule', sql.Decimal(10, 2), poids_cumule)
            .input('variation', sql.Decimal(10, 2), variationVal)
            .input('nourriture_jour', sql.Decimal(10, 2), nourriture_auto)
            .query(`
                UPDATE config_poids
                SET poids_cumule = @poids_cumule, variation = @variation, nourriture_jour = @nourriture_jour
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST recalculer toutes les nourriture_jour existantes
router.post('/recalculate', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT id, semaine, variation FROM config_poids');
        for (const row of result.recordset) {
            const isSemaine0 = parseInt(row.semaine) === 0;
            const nourriture_auto = isSemaine0 ? 0 : calcNourritureJour(parseFloat(row.variation) || 0);
            await pool.request()
                .input('id_' + row.id, sql.Int, row.id)
                .input('nj_' + row.id, sql.Decimal(10, 2), nourriture_auto)
                .query(`UPDATE config_poids SET nourriture_jour = @nj_${row.id} WHERE id = @id_${row.id}`);
        }
        res.json({ message: 'Nourriture/jour recalculée pour toutes les configurations' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE une config poids
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM config_poids WHERE id = @id');
        res.json({ message: 'Configuration supprimée' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
