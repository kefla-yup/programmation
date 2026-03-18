const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET toutes les entrées d'oeufs
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT o.*, r.nom as race_nom
            FROM oeuf o
            JOIN race r ON o.race_id = r.id
            ORDER BY o.date_reception DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET stock oeufs disponibles par race (reçus - transformés)
router.get('/stock', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT r.id as race_id, r.nom as race_nom,
                   ISNULL(SUM(o.nombre), 0) as total_recus,
                   ISNULL((SELECT SUM(t.oeufs_transformes) FROM transformation t WHERE t.race_id = r.id), 0) as total_transformes,
                   ISNULL(SUM(o.nombre), 0) - ISNULL((SELECT SUM(t.oeufs_transformes) FROM transformation t WHERE t.race_id = r.id), 0) as stock_disponible
            FROM race r
            LEFT JOIN oeuf o ON o.race_id = r.id
            GROUP BY r.id, r.nom
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST ajouter des oeufs
router.post('/', async (req, res) => {
    try {
        const { date_reception, race_id, nombre } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('date_reception', sql.Date, date_reception)
            .input('race_id', sql.Int, race_id)
            .input('nombre', sql.Int, nombre)
            .query(`
                INSERT INTO oeuf (date_reception, race_id, nombre)
                OUTPUT INSERTED.*
                VALUES (@date_reception, @race_id, @nombre)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une entrée d'oeufs
router.put('/:id', async (req, res) => {
    try {
        const { date_reception, race_id, nombre } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('date_reception', sql.Date, date_reception)
            .input('race_id', sql.Int, race_id)
            .input('nombre', sql.Int, nombre)
            .query(`
                UPDATE oeuf
                SET date_reception = @date_reception, race_id = @race_id, nombre = @nombre
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE une entrée d'oeufs
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM oeuf WHERE id = @id');
        res.json({ message: 'Entrée d\'oeufs supprimée' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
