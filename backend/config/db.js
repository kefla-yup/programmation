const sql = require('mssql');

const dbConfig = {
    user: 'SA',
    password: 'Itiela123!',
    server: 'localhost',
    port: 1433,
    database: 'poulet_db',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const masterConfig = {
    ...dbConfig,
    database: 'master'
};

let pool = null;

async function getPool() {
    if (!pool) {
        pool = await sql.connect(dbConfig);
    }
    return pool;
}

async function getMasterPool() {
    return await sql.connect(masterConfig);
}

module.exports = { sql, dbConfig, getPool, getMasterPool };
