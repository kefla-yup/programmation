const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET tous les lots
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT l.*, r.nom as race_nom
            FROM lot l
            JOIN race r ON l.race_id = r.id
            ORDER BY l.date_entree DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET un lot par id
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT l.*, r.nom as race_nom
                FROM lot l
                JOIN race r ON l.race_id = r.id
                WHERE l.id = @id
            `);
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Lot non trouvé' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST créer un nouveau lot
router.post('/', async (req, res) => {
    try {
        const { nom, date_entree, nombre, race_id, age_entree_semaine, source } = req.body;
        const pool = await getPool();

        // Récupérer le poids initial = somme cumulative de S0 à Sn
        const poidsResult = await pool.request()
            .input('race_id', sql.Int, race_id)
            .input('semaine', sql.Int, age_entree_semaine || 0)
            .query(`
                SELECT ISNULL(SUM(poids_cumule), 0) as poids_total
                FROM config_poids
                WHERE race_id = @race_id AND semaine <= @semaine
            `);

        const poids_initial = poidsResult.recordset[0].poids_total;

        const result = await pool.request()
            .input('nom', sql.NVarChar, nom)
            .input('date_entree', sql.Date, date_entree)
            .input('nombre', sql.Int, nombre)
            .input('race_id', sql.Int, race_id)
            .input('age_entree_semaine', sql.Int, age_entree_semaine || 0)
            .input('poids_initial', sql.Decimal(10, 2), poids_initial)
            .input('source', sql.NVarChar, source || 'direct')
            .query(`
                INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
                OUTPUT INSERTED.*
                VALUES (@nom, @date_entree, @nombre, @race_id, @age_entree_semaine, @poids_initial, @source)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier un lot
router.put('/:id', async (req, res) => {
    try {
        const { nom, date_entree, nombre, race_id, age_entree_semaine } = req.body;
        const pool = await getPool();

        // Recalculer le poids initial = somme cumulative de S0 à Sn
        const poidsResult = await pool.request()
            .input('race_id', sql.Int, race_id)
            .input('semaine', sql.Int, age_entree_semaine || 0)
            .query(`
                SELECT ISNULL(SUM(poids_cumule), 0) as poids_total
                FROM config_poids
                WHERE race_id = @race_id AND semaine <= @semaine
            `);

        const poids_initial = poidsResult.recordset[0].poids_total;

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nom', sql.NVarChar, nom)
            .input('date_entree', sql.Date, date_entree)
            .input('nombre', sql.Int, nombre)
            .input('race_id', sql.Int, race_id)
            .input('age_entree_semaine', sql.Int, age_entree_semaine || 0)
            .input('poids_initial', sql.Decimal(10, 2), poids_initial)
            .query(`
                UPDATE lot
                SET nom = @nom, date_entree = @date_entree, nombre = @nombre,
                    race_id = @race_id, age_entree_semaine = @age_entree_semaine,
                    poids_initial = @poids_initial
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE un lot
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        // Supprimer d'abord les mortalités liées
        await pool.request()
            .input('lot_id', sql.Int, req.params.id)
            .query('DELETE FROM mortalite WHERE lot_id = @lot_id');
        // Supprimer le lot
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM lot WHERE id = @id');
        res.json({ message: 'Lot supprimé' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
