const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET toutes les races
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM race ORDER BY nom');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST nouvelle race
router.post('/', async (req, res) => {
    try {
        const { nom } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('nom', sql.NVarChar, nom)
            .query('INSERT INTO race (nom) OUTPUT INSERTED.* VALUES (@nom)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE une race
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM race WHERE id = @id');
        res.json({ message: 'Race supprimée' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une race
router.put('/:id', async (req, res) => {
    try {
        const { nom } = req.body;
        if (!nom) {
            return res.status(400).json({ error: 'nom is required' });
        }
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nom', sql.NVarChar, nom)
            .query(`UPDATE race SET nom = @nom WHERE id = @id`);

        // Fetch and return updated record
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM race WHERE id = @id');

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier les paramètres de génétique d'une race
router.put('/:id/genetics', async (req, res) => {
    try {
        const { taux_perte_oeufs, ratio_male_femelle, capacite_ponte } = req.body;

        // Validation
        if (taux_perte_oeufs === undefined || ratio_male_femelle === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (taux_perte_oeufs < 0 || taux_perte_oeufs > 100 || ratio_male_femelle < 0 || ratio_male_femelle > 100) {
            return res.status(400).json({ error: 'Values must be between 0 and 100' });
        }

        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('taux_perte', sql.Decimal(5, 2), taux_perte_oeufs)
            .input('ratio_male', sql.Decimal(5, 2), ratio_male_femelle)
            .input('capacite', sql.Int, capacite_ponte || null)
            .query(`
                UPDATE race
                SET taux_perte_oeufs = @taux_perte,
                    ratio_male_femelle = @ratio_male,
                    capacite_ponte = @capacite
                WHERE id = @id
            `);

        // Fetch and return updated record
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM race WHERE id = @id');

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET paramètres de génétique d'une race
router.get('/:id/genetics', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT id, nom, taux_perte_oeufs, ratio_male_femelle, capacite_ponte
                FROM race
                WHERE id = @id
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
