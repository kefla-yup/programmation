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
        
        // Check oeuf records and when they should hatch
        const oeufs = await pool.request().query(`
            SELECT 
                o.id,
                o.date_reception,
                cp.nb_jour_eclosion,
                DATEADD(DAY, ISNULL(cp.nb_jour_eclosion, 21), o.date_reception) as date_eclosion_prevention,
                CAST(o.nombre AS VARCHAR) + ' eggs' as nombre
            FROM oeuf o
            LEFT JOIN config_prix cp ON cp.race_id = o.race_id
            ORDER BY o.date_reception
        `);
        
        console.log('Egg hatching schedule:');
        console.table(oeufs.recordset);
        
        // Check transformations
        const trans = await pool.request().query(`
            SELECT 
                date_transformation,
                CAST(oeufs_transformes AS VARCHAR) + ' → ' + CAST(nouveaux_poussins AS VARCHAR) + ' (loss: ' + CAST(oeufs_pourris AS VARCHAR) + ')' as result
            FROM transformation
            ORDER BY date_transformation
        `);
        
        console.log('\nTransformations completed:');
        console.table(trans.recordset);
        
        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

check();
