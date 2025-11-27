const express = require('express');
const router = express.Router();
const db = require('../db/db');

// ------------------------------
// 1. 게시판 목록 + 검색 + 페이징
// ------------------------------
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    try {
        const [rows] = await db.query(
            `SELECT * FROM board 
             WHERE title LIKE ? 
             ORDER BY id DESC 
             LIMIT ? OFFSET ?`,
            [`%${search}%`, limit, offset]
        );

        const [[{ count }]] = await db.query(
            `SELECT COUNT(*) AS count FROM board WHERE title LIKE ?`,
            [`%${search}%`]
        );

        const totalPage = Math.ceil(count / limit);

        res.render('list', { rows, page, totalPage, search });
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 2. 게시물 보기 + 조회수 증가 + 댓글 목록
// ------------------------------
router.get('/view/:id', async (req, res) => {
    const id = req.params.id;

    try {
        await db.query(`UPDATE board SET view_count = view_count + 1 WHERE id = ?`, [id]);
        const [post] = await db.query(`SELECT * FROM board WHERE id = ?`, [id]);

        if (post.length === 0) {
            return res.send('존재하지 않는 게시글입니다.');
        }

        const [comments] = await db.query(
            `SELECT * FROM comment WHERE board_id = ? ORDER BY id ASC`,
            [id]
        );

        res.render('view', { row: post[0], comments: comments || [] });
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 3. 글쓰기
// ------------------------------
router.get('/write', (req, res) => {
    res.render('write');
});

router.post('/write', async (req, res) => {
    const { title, content } = req.body;
    try {
        await db.query(`INSERT INTO board (title, content) VALUES (?, ?)`, [title, content]);
        res.redirect('/board');
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 4. 글 수정
// ------------------------------
router.get('/edit/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const [row] = await db.query(`SELECT * FROM board WHERE id = ?`, [id]);
        if (row.length === 0) return res.send('존재하지 않는 게시글입니다.');
        res.render('edit', { row: row[0] });
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

router.post('/edit/:id', async (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body;
    try {
        await db.query(`UPDATE board SET title=?, content=? WHERE id=?`, [title, content, id]);
        res.redirect('/board/view/' + id);
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 5. 글 삭제
// ------------------------------
router.get('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query(`DELETE FROM board WHERE id=?`, [id]);
        res.redirect('/board');
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 6. 댓글 작성
// ------------------------------
router.post('/comment/:board_id', async (req, res) => {
    const board_id = req.params.board_id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.redirect('/board/view/' + board_id);
    }

    try {
        await db.query(
            `INSERT INTO comment (board_id, content) VALUES (?, ?)`,
            [board_id, content]
        );
        res.redirect('/board/view/' + board_id);
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

// ------------------------------
// 7. 댓글 삭제
// ------------------------------
router.get('/comment/delete/:id', async (req, res) => {
    const comment_id = req.params.id;

    try {
        const [rows] = await db.query(`SELECT board_id FROM comment WHERE id=?`, [comment_id]);
        if (rows.length === 0) return res.send('존재하지 않는 댓글입니다.');

        const board_id = rows[0].board_id;

        await db.query(`DELETE FROM comment WHERE id=?`, [comment_id]);

        res.redirect('/board/view/' + board_id);
    } catch (err) {
        console.error(err);
        res.send('DB Error');
    }
});

module.exports = router;
