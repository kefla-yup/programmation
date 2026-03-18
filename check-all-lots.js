const sql = require('mssql');

const config = {
    user: 'SA',
    password: 'Sqlserver1!',
    server: 'localhost',
    port: 1433,
    database: 'poulet_db',
    options: { encrypt: false, trustServerCertificate: true }
};

async function check() {
    try {
        const pool = await sql.connect(config);
        
        const lots = await pool.request().query(`
            SELECT id, nom, date_entree, nombre, source, nombre_femelles, nombre_males
            FROM lot
            ORDER BY date_entree
        `);
        
        console.log('\nAll lots:');
        console.table(lots.recordset);
        
        const trans = await pool.request().query(`
            SELECT date_transformation, oeufs_transformes, oeufs_pourris, nouveaux_poussins
            FROM transformation
            ORDER BY date_transformation
        `);
        
        console.log('\nTransformations:');
        console.table(trans.recordset);
        
        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

check();
