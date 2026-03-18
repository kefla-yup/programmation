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
        const { race_id, prix_achat_tete, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf, nb_jour_eclosion } = req.body;

        // Validation
        if (!race_id || prix_achat_tete === undefined || prix_vente_gramme === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (prix_achat_tete < 0 || prix_vente_gramme < 0) {
            return res.status(400).json({ error: 'Prices cannot be negative' });
        }
        if (nb_jour_eclosion !== undefined && (nb_jour_eclosion <= 0 || !Number.isInteger(nb_jour_eclosion))) {
            return res.status(400).json({ error: 'Incubation days must be a positive integer' });
        }

        const pool = await getPool();

        // Upsert: update si existe, insert sinon
        const result = await pool.request()
            .input('race_id', sql.Int, race_id)
            .input('prix_achat_tete', sql.Decimal(10, 2), prix_achat_tete)
            .input('prix_vente_gramme', sql.Decimal(10, 2), prix_vente_gramme)
            .input('prix_nourriture_gramme', sql.Decimal(10, 2), prix_nourriture_gramme || 0)
            .input('prix_oeuf', sql.Decimal(10, 2), prix_oeuf || 0)
            .input('nb_jour_eclosion', sql.Int, nb_jour_eclosion || 21)
            .query(`
                MERGE config_prix AS target
                USING (SELECT @race_id as race_id) AS source
                ON target.race_id = source.race_id
                WHEN MATCHED THEN
                    UPDATE SET
                        prix_achat_tete = @prix_achat_tete,
                        prix_vente_gramme = @prix_vente_gramme,
                        prix_nourriture_gramme = @prix_nourriture_gramme,
                        prix_oeuf = @prix_oeuf,
                        nb_jour_eclosion = @nb_jour_eclosion
                WHEN NOT MATCHED THEN
                    INSERT (race_id, prix_achat_tete, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf, nb_jour_eclosion)
                    VALUES (@race_id, @prix_achat_tete, @prix_vente_gramme, @prix_nourriture_gramme, @prix_oeuf, @nb_jour_eclosion)
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
        const { prix_achat_tete, prix_vente_gramme, prix_nourriture_gramme, prix_oeuf, nb_jour_eclosion } = req.body;

        // Validation
        if (prix_achat_tete === undefined || prix_vente_gramme === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (prix_achat_tete < 0 || prix_vente_gramme < 0) {
            return res.status(400).json({ error: 'Prices cannot be negative' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('prix_achat_tete', sql.Decimal(10, 2), prix_achat_tete)
            .input('prix_vente_gramme', sql.Decimal(10, 2), prix_vente_gramme)
            .input('prix_nourriture_gramme', sql.Decimal(10, 2), prix_nourriture_gramme || 0)
            .input('prix_oeuf', sql.Decimal(10, 2), prix_oeuf || 0)
            .input('nb_jour_eclosion', sql.Int, nb_jour_eclosion || 21)
            .query(`
                UPDATE config_prix
                SET prix_achat_tete = @prix_achat_tete,
                    prix_vente_gramme = @prix_vente_gramme,
                    prix_nourriture_gramme = @prix_nourriture_gramme,
                    prix_oeuf = @prix_oeuf,
                    nb_jour_eclosion = @nb_jour_eclosion
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE config prix
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM config_prix WHERE id = @id');
        res.json({ message: 'Configuration prix supprimée' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
