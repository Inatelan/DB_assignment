const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2/promise');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MySQL 연결
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234', // 학습용
    database: 'boarddb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 루트 접속 → 게시판 목록으로 리다이렉트
app.get('/', (req, res) => {
    res.redirect('/board');
});

// 게시글 목록
app.get('/board', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();
    try {
        const [totalRows] = await conn.query(
            `SELECT COUNT(*) AS count FROM posts WHERE title LIKE ?`, [`%${search}%`]
        );
        const totalPage = Math.ceil(totalRows[0].count / limit);

        const [rows] = await conn.query(
            `SELECT * FROM posts WHERE title LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?`,
            [`%${search}%`, limit, offset]
        );

        res.render('layout', { view: 'list', rows, page, totalPage, search });
    } finally {
        conn.release();
    }
});

// 게시글 상세
app.get('/board/view/:id', async (req, res) => {
    const id = req.params.id;
    const conn = await pool.getConnection();
    try {
        await conn.query(`UPDATE posts SET view_count = view_count + 1 WHERE id = ?`, [id]);
        const [rows] = await conn.query(`SELECT * FROM posts WHERE id = ?`, [id]);
        const row = rows[0];
        const [comments] = await conn.query(`SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC`, [id]);
        res.render('layout', { view: 'view', row, comments });
    } finally {
        conn.release();
    }
});

// 게시글 작성
app.get('/board/write', (req, res) => {
    res.render('layout', { view: 'write' });
});

app.post('/board/write', async (req, res) => {
    const { title, content } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.query(`INSERT INTO posts(title, content, view_count) VALUES(?, ?, 0)`, [title, content]);
        res.redirect('/board');
    } finally {
        conn.release();
    }
});

// 게시글 수정
app.get('/board/edit/:id', async (req, res) => {
    const id = req.params.id;
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.query(`SELECT * FROM posts WHERE id = ?`, [id]);
        const row = rows[0];
        res.render('layout', { view: 'edit', row });
    } finally {
        conn.release();
    }
});

app.post('/board/edit/:id', async (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.query(`UPDATE posts SET title=?, content=? WHERE id=?`, [title, content, id]);
        res.redirect(`/board/view/${id}`);
    } finally {
        conn.release();
    }
});

// 게시글 삭제
app.get('/board/delete/:id', async (req, res) => {
    const id = req.params.id;
    const conn = await pool.getConnection();
    try {
        await conn.query(`DELETE FROM posts WHERE id=?`, [id]);
        await conn.query(`DELETE FROM comments WHERE post_id=?`, [id]);
        res.redirect('/board');
    } finally {
        conn.release();
    }
});

// 댓글 작성
app.post('/board/comment/:post_id', async (req, res) => {
    const post_id = req.params.post_id;
    let { content, nickname } = req.body;

    if (!nickname || nickname.trim() === '') {
        nickname = '익명';
    }

    const conn = await pool.getConnection();
    try {
        await conn.query(
            `INSERT INTO comments(post_id, content, nickname, created_at) VALUES(?, ?, ?, NOW())`,
            [post_id, content, nickname]
        );
        res.redirect(`/board/view/${post_id}`);
    } finally {
        conn.release();
    }
});


// 댓글 삭제
app.get('/board/comment/delete/:id', async (req, res) => {
    const id = req.params.id;
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.query(`SELECT post_id FROM comments WHERE id=?`, [id]);
        if (rows.length > 0) {
            const post_id = rows[0].post_id;
            await conn.query(`DELETE FROM comments WHERE id=?`, [id]);
            res.redirect(`/board/view/${post_id}`);
        } else {
            res.redirect('/board');
        }
    } finally {
        conn.release();
    }
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
