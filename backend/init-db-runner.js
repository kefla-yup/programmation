/**
 * Script pour initialiser la base de données
 * Usage: node init-db-runner.js
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const masterConfig = {
    user: 'SA',
    password: 'Sqlserver1!',
    server: 'localhost',
    port: 1433,
    database: 'master',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const dbConfig = {
    ...masterConfig,
    database: 'poulet_db'
};

async function initDB() {
    let pool;
    try {
        // Connect to master to create database
        pool = await sql.connect(masterConfig);
        console.log('Connecté à SQL Server (master)');

        // Create database if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'poulet_db')
            BEGIN
                CREATE DATABASE poulet_db;
            END
        `);
        console.log('Base de données poulet_db vérifiée/créée');
        await pool.close();

        // Connect to poulet_db
        pool = await sql.connect(dbConfig);
        console.log('Connecté à poulet_db');

        // Read and execute SQL file
        const sqlFile = fs.readFileSync(path.join(__dirname, 'init-db.sql'), 'utf8');

        // Split by GO and execute each batch
        const batches = sqlFile.split(/^GO\s*$/gm).filter(b => b.trim());

        for (const batch of batches) {
            if (batch.trim()) {
                try {
                    await pool.request().query(batch);
                } catch (err) {
                    // Skip database creation errors (already handled above)
                    if (!err.message.includes('poulet_db')) {
                        console.warn('Warning batch:', err.message.substring(0, 100));
                    }
                }
            }
        }

        console.log('✅ Base de données initialisée avec succès !');
    } catch (err) {
        console.error('❌ Erreur:', err.message);
    } finally {
        if (pool) await pool.close();
        process.exit(0);
    }
}

initDB();
