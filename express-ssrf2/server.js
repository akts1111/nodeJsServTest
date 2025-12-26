const express = require('express');
const morgan = require('morgan');
const app = express();
const PORT = 3001;

// --- 1. ボディ解析ミドルウェア ---
app.use(express.json());
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));

// --- 2. ロギング設定：レスポンスのヘッダーとボディを監視 ---
app.use((req, res, next) => {
    // オリジナルのメソッドを保存
    const originalSend = res.send;

    // レスポンスが送信される際の処理をオーバーライド
    res.send = function (body) {
        console.log('\n' + '='.repeat(50));
        console.log(`[${new Date().toISOString()}] Transaction Details`);
        console.log(`From: ${req.ip}  Method: ${req.method}  URL: ${req.originalUrl}`);

        // --- REQUEST LOG ---
        console.log('\n>>> REQUEST HEADERS >>>');
        console.table(req.headers);
        if (Object.keys(req.query).length > 0) {
            console.log('>>> REQUEST QUERY:', req.query);
        }
        if (req.body && Object.keys(req.body).length > 0) {
            console.log('>>> REQUEST BODY:', req.body);
        }

        // --- RESPONSE LOG ---
        console.log('\n<<< RESPONSE HEADERS <<<');
        console.table(res.getHeaders()); // 送信予定のレスポンスヘッダーを表示
        console.log('<<< RESPONSE BODY:', body);

        console.log('='.repeat(50) + '\n');

        // 本来の送信処理を実行
        return originalSend.apply(res, arguments);
    };
    next();
});

// morganは簡易ログとして残す（標準出力用）
app.use(morgan(':method :url :status - :response-time ms'));

// --- 3. エンドポイント設定 ---

app.get('/', (req, res) => {
    res.send('SSRF Verification Server (Upgraded Version)');
});

app.all('/log', (req, res) => {
    // ターゲットから情報を盗み出す際の受け皿
    res.status(200).send({ status: "logged", message: "Data received by server" });
});

app.get('/redirect', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" parameter.');
    }
    console.log(`[Action] Redirecting to: ${targetUrl}`);
    // redirectの場合、ヘッダーにLocationが含まれることをログで確認できます
    res.redirect(302, targetUrl);
});

app.get('/internal/secret', (req, res) => {
    res.json({
        status: "success",
        data: "SECRET_TOKEN_12345",
        detected_ip: req.ip
    });
});

// --- 4. サーバー起動 ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '*'.repeat(50));
    console.log(`SSRF Test Server with Full Logging`);
    console.log(`- Listening on: http://0.0.0.0:${PORT}`);
    console.log('*'.repeat(50) + '\n');
});