const express = require('express');
const morgan = require('morgan');
const app = express();
const PORT = 3001;

// --- ロギング設定 ---
// 'dev' または詳細な 'combined' 形式でリクエストをログ出力
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// カスタムミドルウェア：すべてのリクエストヘッダーをコンソールに表示
app.use((req, res, next) => {
    console.log('--- Incoming Request Headers ---');
    console.table(req.headers);
    next();
});

// --- エンドポイント設定 ---

// 1. 基本のトップページ
app.get('/', (req, res) => {
    res.send('SSRF Verification Server (Express Version)');
});

// 2. リダイレクト検証用 (302)
// 例: /redirect?url=http://169.254.169.254/latest/meta-data/
app.get('/redirect', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" parameter');
    }
    console.log(`[Redirect] Target: ${targetUrl}`);
    res.redirect(302, targetUrl);
});

// 3. 内部情報のダミーエンドポイント (SSRFが成功した時のゴール役)
app.get('/internal/secret', (req, res) => {
    res.json({
        status: "success",
        data: "This is a sensitive internal message!",
        clientIp: req.ip
    });
});

// 0.0.0.0 で待ち受け（すべてのインターフェースからアクセス許可）
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express SSRF Server running on http://0.0.0.0:${PORT}`);
});