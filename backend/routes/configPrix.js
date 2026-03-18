const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET config prix (toutes les races)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT cp.*, r.nom as race_nom
            FROM config_prix cp
            JOIN race r ON cp.race_id = r.id
            ORDER BY r.nom
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST ajouter/modifier config prix
router.post('/', async (req, res) => {
    try {
        const { race_id, prix_achat_gramme, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf } = req.body;
        const pool = await getPool();

        // Upsert: update si existe, insert sinon
        const result = await pool.request()
            .input('race_id', sql.Int, race_id)
            .input('prix_achat_gramme', sql.Decimal(10, 2), prix_achat_gramme)
            .input('prix_vente_gramme', sql.Decimal(10, 2), prix_vente_gramme)
            .input('prix_nourriture_gramme', sql.Decimal(10, 2), prix_nourriture_gramme || 0)
            .input('prix_oeuf', sql.Decimal(10, 2), prix_oeuf || 0)
            .query(`
                MERGE config_prix AS target
                USING (SELECT @race_id as race_id) AS source
                ON target.race_id = source.race_id
                WHEN MATCHED THEN
                    UPDATE SET
                        prix_achat_gramme = @prix_achat_gramme,
                        prix_vente_gramme = @prix_vente_gramme,
                        prix_nourriture_gramme = @prix_nourriture_gramme,
                        prix_oeuf = @prix_oeuf
                WHEN NOT MATCHED THEN
                    INSERT (race_id, prix_achat_gramme, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf)
                    VALUES (@race_id, @prix_achat_gramme, @prix_vente_gramme, @prix_nourriture_gramme, @prix_oeuf)
                OUTPUT INSERTED.*;
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier config prix
router.put('/:id', async (req, res) => {
    try {
        const { prix_achat_gramme, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('prix_achat_gramme', sql.Decimal(10, 2), prix_achat_gramme)
            .input('prix_vente_gramme', sql.Decimal(10, 2), prix_vente_gramme)
            .input('prix_nourriture_gramme', sql.Decimal(10, 2), prix_nourriture_gramme || 0)
            .input('prix_oeuf', sql.Decimal(10, 2), prix_oeuf || 0)
            .query(`
                UPDATE config_prix
                SET prix_achat_gramme = @prix_achat_gramme,
                    prix_vente_gramme = @prix_vente_gramme,
                    prix_nourriture_gramme = @prix_nourriture_gramme,
                    prix_oeuf = @prix_oeuf
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
