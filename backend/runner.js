require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const masterConfig = {
    user: process.env.DB_USER || 'SA',
    password: process.env.DB_PASSWORD || 'Sqlserver1!',
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: 'master',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function runResetScript() {
    console.log('Connexion a SQL Server...');

    let pool = null;
    try {
        pool = await sql.connect(masterConfig);
        console.log('Connecte a la base master');

        // Lire le fichier reset-db.sql
        const scriptPath = path.join(__dirname, 'reset-db.sql');
        const script = fs.readFileSync(scriptPath, 'utf-8');

        // Decouper par GO (separateur de batch SQL Server)
        const batches = script
            .split(/^\s*GO\s*$/mi)
            .map(b => b.trim())
            .filter(b => b.length > 0);

        console.log(`Execution de ${batches.length} batch(s)...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`\n--- Batch ${i + 1}/${batches.length} ---`);
            console.log(batch.substring(0, 100) + (batch.length > 100 ? '...' : ''));

            try {
                await pool.request().query(batch);
                console.log('OK');
            } catch (err) {
                console.error(`Erreur batch ${i + 1}:`, err.message);
                throw err;
            }
        }

        console.log('\n========================================');
        console.log('Base de donnees reinitalisee avec succes!');
        console.log('========================================');

    } catch (err) {
        console.error('Erreur:', err.message);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
        }
        process.exit(0);
    }
}

runResetScript();
