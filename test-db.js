const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'zox_user',
    password: 'your_database_password',
    database: 'zox_db',
    connectionLimit: 5
});

async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log("Connected successfully!");
    } catch (err) {
        console.error("Connection failed:", err);
    } finally {
        if (conn) conn.release(); // release to pool
        process.exit(0);
    }
}

testConnection();
