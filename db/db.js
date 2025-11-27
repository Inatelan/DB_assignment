const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',   // 설치 시 설정한 비밀번호
    database: 'boarddb',
    connectionLimit: 10
});

module.exports = pool;
