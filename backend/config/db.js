require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
    user: process.env.DB_USER || 'SA',
    password: process.env.DB_PASSWORD || 'Sqlserver1!',
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME || 'poulet_db',
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
