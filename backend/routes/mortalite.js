const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');

// GET mortalités (optionnel: filtrer par lot_id)
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        let query = `
            SELECT m.*,
                   l.nom as lot_nom,
                   CASE WHEN m.nombre > 0 THEN ROUND(m.nombre_morts_males * 100.0 / m.nombre, 1) ELSE 0 END as pct_morts_males,
                   CASE WHEN m.nombre > 0 THEN ROUND(m.nombre_morts_femelles * 100.0 / m.nombre, 1) ELSE 0 END as pct_morts_femelles
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
        const { lot_id, date_mortalite, nombre, nombre_morts_males, nombre_morts_femelles } = req.body;

        // Validation
        if (!lot_id || !date_mortalite || nombre === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (nombre <= 0 || !Number.isInteger(nombre)) {
            return res.status(400).json({ error: 'Nombre must be a positive integer' });
        }

        // Si genres fournis, vérifier que la somme = total
        let mort_males = nombre_morts_males || 0;
        let mort_femelles = nombre_morts_femelles || 0;

        if (mort_males + mort_femelles !== nombre && (mort_males > 0 || mort_femelles > 0)) {
            return res.status(400).json({
                error: `Mâles (${mort_males}) + Femelles (${mort_femelles}) doit égaler Total (${nombre})`
            });
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date_mortalite)) {
            return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('lot_id', sql.Int, lot_id)
            .input('date_mortalite', sql.Date, date_mortalite)
            .input('nombre', sql.Int, nombre)
            .input('mort_males', sql.Int, mort_males)
            .input('mort_femelles', sql.Int, mort_femelles)
            .query(`
                INSERT INTO mortalite (lot_id, date_mortalite, nombre, nombre_morts_males, nombre_morts_femelles)
                OUTPUT INSERTED.*
                VALUES (@lot_id, @date_mortalite, @nombre, @mort_males, @mort_femelles)
            `);

        // Ajouter les pourcentages
        const rec = result.recordset[0];
        rec.pct_morts_males = rec.nombre > 0 ? Math.round(rec.nombre_morts_males * 100 / rec.nombre * 10) / 10 : 0;
        rec.pct_morts_femelles = rec.nombre > 0 ? Math.round(rec.nombre_morts_femelles * 100 / rec.nombre * 10) / 10 : 0;

        res.status(201).json(rec);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT modifier une mortalité
router.put('/:id', async (req, res) => {
    try {
        const { lot_id, date_mortalite, nombre, nombre_morts_males, nombre_morts_femelles } = req.body;

        // Validation
        if (!lot_id || !date_mortalite || nombre === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let mort_males = nombre_morts_males || 0;
        let mort_femelles = nombre_morts_femelles || 0;

        if (mort_males + mort_femelles !== nombre && (mort_males > 0 || mort_femelles > 0)) {
            return res.status(400).json({
                error: `Mâles (${mort_males}) + Femelles (${mort_femelles}) doit égaler Total (${nombre})`
            });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('lot_id', sql.Int, lot_id)
            .input('date_mortalite', sql.Date, date_mortalite)
            .input('nombre', sql.Int, nombre)
            .input('mort_males', sql.Int, mort_males)
            .input('mort_femelles', sql.Int, mort_femelles)
            .query(`
                UPDATE mortalite
                SET lot_id = @lot_id, date_mortalite = @date_mortalite, nombre = @nombre,
                    nombre_morts_males = @mort_males, nombre_morts_femelles = @mort_femelles
                OUTPUT INSERTED.*
                WHERE id = @id
            `);

        // Ajouter les pourcentages
        const rec = result.recordset[0];
        rec.pct_morts_males = rec.nombre > 0 ? Math.round(rec.nombre_morts_males * 100 / rec.nombre * 10) / 10 : 0;
        rec.pct_morts_femelles = rec.nombre > 0 ? Math.round(rec.nombre_morts_femelles * 100 / rec.nombre * 10) / 10 : 0;

        res.json(rec);
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
