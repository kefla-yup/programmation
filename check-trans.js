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
        const result = await pool.request().query(`
            SELECT * FROM transformation
        `);
        console.log('Transformations:');
        console.table(result.recordset);
        await pool.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
    process.exit(0);
}

check();
