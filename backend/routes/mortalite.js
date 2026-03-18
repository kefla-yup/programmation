const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET mortalités (optionnel: filtrer par lot_id)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        let query = `
            SELECT m.*, l.nom as lot_nom
            FROM mortalite m
            JOIN lot l ON m.lot_id = l.id
        `;
        const request = pool.request();
        if (req.query.lot_id) {
            query += ' WHERE m.lot_id = @lot_id';
            request.input('lot_id', sql.Int, req.query.lot_id);
        }
        query += ' ORDER BY m.date_mortalite DESC';
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST enregistrer une mortalité
router.post('/', async (req, res) => {
    try {
        const { lot_id, date_mortalite, nombre } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('lot_id', sql.Int, lot_id)
            .input('date_mortalite', sql.Date, date_mortalite)
            .input('nombre', sql.Int, nombre)
            .query(`
                INSERT INTO mortalite (lot_id, date_mortalite, nombre)
                OUTPUT INSERTED.*
                VALUES (@lot_id, @date_mortalite, @nombre)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une mortalité
router.put('/:id', async (req, res) => {
    try {
        const { lot_id, date_mortalite, nombre } = req.body;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('lot_id', sql.Int, lot_id)
            .input('date_mortalite', sql.Date, date_mortalite)
            .input('nombre', sql.Int, nombre)
            .query(`
                UPDATE mortalite
                SET lot_id = @lot_id, date_mortalite = @date_mortalite, nombre = @nombre
                OUTPUT INSERTED.*
                WHERE id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE une mortalité
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM mortalite WHERE id = @id');
        res.json({ message: 'Mortalité supprimée' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
