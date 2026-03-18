const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET toutes les transformations
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT t.*, r.nom as race_nom, l.nom as lot_nom
            FROM transformation t
            JOIN race r ON t.race_id = r.id
            LEFT JOIN lot l ON t.lot_id = l.id
            ORDER BY t.date_transformation DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST transformer des oeufs en poussins (crée automatiquement un lot)
router.post('/', async (req, res) => {
    try {
        const { date_transformation, race_id, oeufs_transformes, nouveaux_poussins } = req.body;
        const pool = await getPool();

        // Vérifier le stock d'oeufs disponible
        const stockResult = await pool.request()
            .input('race_id', sql.Int, race_id)
            .query(`
                SELECT
                    ISNULL((SELECT SUM(nombre) FROM oeuf WHERE race_id = @race_id), 0)
                    - ISNULL((SELECT SUM(oeufs_transformes) FROM transformation WHERE race_id = @race_id), 0)
                    as stock_disponible
            `);

        const stockDispo = stockResult.recordset[0].stock_disponible;
        if (oeufs_transformes > stockDispo) {
            return res.status(400).json({
                error: `Stock d'oeufs insuffisant. Disponible: ${stockDispo}, Demandé: ${oeufs_transformes}`
            });
        }

        // Récupérer le poids à S0 pour la race
        const poidsResult = await pool.request()
            .input('race_id2', sql.Int, race_id)
            .query(`
                SELECT poids_cumule FROM config_poids
                WHERE race_id = @race_id2 AND semaine = 0
            `);

        const poidsInitial = poidsResult.recordset.length > 0
            ? poidsResult.recordset[0].poids_cumule
            : 0;

        // Récupérer le nom de la race
        const raceResult = await pool.request()
            .input('race_id3', sql.Int, race_id)
            .query('SELECT nom FROM race WHERE id = @race_id3');
        const raceNom = raceResult.recordset[0].nom;

        // Créer automatiquement un nouveau lot
        const lotResult = await pool.request()
            .input('nom', sql.NVarChar, `Lot-Transfo-${raceNom}-${date_transformation}`)
            .input('date_entree', sql.Date, date_transformation)
            .input('nombre', sql.Int, nouveaux_poussins)
            .input('race_id4', sql.Int, race_id)
            .input('poids_initial', sql.Decimal(10, 2), poidsInitial)
            .input('source', sql.NVarChar, 'transformation')
            .query(`
                INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
                OUTPUT INSERTED.*
                VALUES (@nom, @date_entree, @nombre, @race_id4, 0, @poids_initial, @source)
            `);

        const lotId = lotResult.recordset[0].id;

        // Enregistrer la transformation
        const transResult = await pool.request()
            .input('date_transformation', sql.Date, date_transformation)
            .input('race_id5', sql.Int, race_id)
            .input('oeufs_transformes', sql.Int, oeufs_transformes)
            .input('nouveaux_poussins', sql.Int, nouveaux_poussins)
            .input('lot_id', sql.Int, lotId)
            .query(`
                INSERT INTO transformation (date_transformation, race_id, oeufs_transformes, nouveaux_poussins, lot_id)
                OUTPUT INSERTED.*
                VALUES (@date_transformation, @race_id5, @oeufs_transformes, @nouveaux_poussins, @lot_id)
            `);

        res.status(201).json({
            transformation: transResult.recordset[0],
            lot: lotResult.recordset[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE une transformation (et le lot associé)
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();

        // Récupérer le lot_id associé
        const trans = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT lot_id FROM transformation WHERE id = @id');

        if (trans.recordset.length > 0 && trans.recordset[0].lot_id) {
            const lotId = trans.recordset[0].lot_id;
            // Supprimer mortalités du lot
            await pool.request()
                .input('lot_id', sql.Int, lotId)
                .query('DELETE FROM mortalite WHERE lot_id = @lot_id');
        }

        // Supprimer la transformation
        await pool.request()
            .input('id2', sql.Int, req.params.id)
            .query('DELETE FROM transformation WHERE id = @id2');

        // Supprimer le lot auto-généré
        if (trans.recordset.length > 0 && trans.recordset[0].lot_id) {
            await pool.request()
                .input('lot_id2', sql.Int, trans.recordset[0].lot_id)
                .query('DELETE FROM lot WHERE id = @lot_id2');
        }

        res.json({ message: 'Transformation et lot associé supprimés' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
