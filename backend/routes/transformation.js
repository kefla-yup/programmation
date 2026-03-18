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

        // Validate input
        if (!date_transformation || !race_id || !oeufs_transformes || !nouveaux_poussins) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (oeufs_transformes <= 0 || nouveaux_poussins <= 0) {
            return res.status(400).json({ error: 'Counts must be positive' });
        }
        if (oeufs_transformes < nouveaux_poussins) {
            return res.status(400).json({ error: 'Cannot have more chicks than eggs' });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date_transformation)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

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
            .input('race_id_poids', sql.Int, race_id)
            .query(`
                SELECT poids_cumule FROM config_poids
                WHERE race_id = @race_id_poids AND semaine = 0
            `);

        const poidsInitial = poidsResult.recordset.length > 0
            ? poidsResult.recordset[0].poids_cumule
            : 0;

        // Récupérer le nom de la race
        const raceResult = await pool.request()
            .input('race_id_nom', sql.Int, race_id)
            .query('SELECT nom FROM race WHERE id = @race_id_nom');

        // NULL check for race
        if (!raceResult.recordset.length) {
            return res.status(404).json({ error: 'Race not found' });
        }
        const raceNom = raceResult.recordset[0].nom;

        // Start transaction for atomic operations
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();

            // Créer automatiquement un nouveau lot
            const lotResult = await transaction.request()
                .input('nom', sql.NVarChar, `Lot-Transfo-${raceNom}-${date_transformation}`)
                .input('date_entree', sql.Date, date_transformation)
                .input('nombre', sql.Int, nouveaux_poussins)
                .input('race_id_lot', sql.Int, race_id)
                .input('poids_initial', sql.Decimal(10, 2), poidsInitial)
                .input('source', sql.NVarChar, 'transformation')
                .query(`
                    INSERT INTO lot (nom, date_entree, nombre, race_id, age_entree_semaine, poids_initial, source)
                    OUTPUT INSERTED.*
                    VALUES (@nom, @date_entree, @nombre, @race_id_lot, 0, @poids_initial, @source)
                `);

            const lotId = lotResult.recordset[0].id;

            // Enregistrer la transformation
            const transResult = await transaction.request()
                .input('date_transformation', sql.Date, date_transformation)
                .input('race_id_trans', sql.Int, race_id)
                .input('oeufs_transformes', sql.Int, oeufs_transformes)
                .input('nouveaux_poussins', sql.Int, nouveaux_poussins)
                .input('lot_id', sql.Int, lotId)
                .query(`
                    INSERT INTO transformation (date_transformation, race_id, oeufs_transformes, nouveaux_poussins, lot_id)
                    OUTPUT INSERTED.*
                    VALUES (@date_transformation, @race_id_trans, @oeufs_transformes, @nouveaux_poussins, @lot_id)
                `);

            await transaction.commit();

            res.status(201).json({
                transformation: transResult.recordset[0],
                lot: lotResult.recordset[0]
            });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une transformation
router.put('/:id', async (req, res) => {
    try {
        const { date_transformation, oeufs_transformes, nouveaux_poussins } = req.body;

        // Validate input
        if (!date_transformation || oeufs_transformes === undefined || nouveaux_poussins === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (oeufs_transformes <= 0 || nouveaux_poussins <= 0) {
            return res.status(400).json({ error: 'Counts must be positive' });
        }
        if (oeufs_transformes < nouveaux_poussins) {
            return res.status(400).json({ error: 'Cannot have more chicks than eggs' });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date_transformation)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const pool = await getPool();

        // Récupérer la transformation actuelle
        const currentTrans = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM transformation WHERE id = @id');

        if (currentTrans.recordset.length === 0) {
            return res.status(404).json({ error: 'Transformation not found' });
        }

        const trans = currentTrans.recordset[0];

        // Update transformation
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('date_transformation', sql.Date, date_transformation)
            .input('oeufs_transformes', sql.Int, oeufs_transformes)
            .input('oeufs_pourris', sql.Int, oeufs_transformes - nouveaux_poussins)
            .input('nouveaux_poussins', sql.Int, nouveaux_poussins)
            .query(`
                UPDATE transformation
                SET date_transformation = @date_transformation,
                    oeufs_transformes = @oeufs_transformes,
                    oeufs_pourris = @oeufs_pourris,
                    nouveaux_poussins = @nouveaux_poussins
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        res.json(result.recordset[0]);
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
