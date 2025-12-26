const express = require('express');
const app = express();
const PORT = 3001;

let accessLogs = [];

app.use(express.json());
app.use(express.text({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));

// --- ヘルパー関数 ---
function buildRawRequest(req) {
    let raw = `${req.method} ${req.originalUrl} HTTP/1.1\n`;
    Object.entries(req.headers).forEach(([h, v]) => raw += `${h}: ${v}\n`);
    raw += '\n';
    if (req.body) {
        raw += typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body;
    }
    return raw;
}

function buildRawResponse(res, body) {
    let raw = `HTTP/1.1 ${res.statusCode} ${res.statusMessage || ''}\n`;
    const headers = res.getHeaders();
    Object.entries(headers).forEach(([h, v]) => raw += `${h}: ${v}\n`);
    raw += '\n' + (typeof body === 'object' ? JSON.stringify(body, null, 2) : body);
    return raw;
}

// --- ログ収集 ---
app.use((req, res, next) => {
    const originalSend = res.send;
    if (req.path.startsWith('/admin')) return next();

    res.send = function (body) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleString().replace(/\//g, '-'),
            ip: req.ip,
            method: req.method,
            url: req.originalUrl,
            rawRequest: buildRawRequest(req),
            rawResponse: buildRawResponse(res, body)
        };
        accessLogs.unshift(logEntry);
        if (accessLogs.length > 50) accessLogs.pop();
        return originalSend.apply(res, arguments);
    };
    next();
});

// --- 管理画面 ---
app.get('/admin', (req, res) => {
    // ログごとに「そのログ専用のダウンロード用文字列」を隠し属性として持たせる
    const logCards = accessLogs.map((l, index) => {
        const fullLog = `=== REQUEST ===\n${l.rawRequest}\n\n=== RESPONSE ===\n${l.rawResponse}`;
        // Base64エンコードしてHTMLに埋め込むことで、JSのパースエラーを回避
        const encodedLog = Buffer.from(fullLog).toString('base64');

        return `
        <div style="background:white; border-radius:8px; margin-bottom:20px; padding:15px; box-shadow:0 2px 5px rgba(0,0,0,0.1); border-left:5px solid #007bff;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span><strong>[${l.timestamp}]</strong> ${l.method} ${l.url}</span>
                <button 
                    style="padding:5px 10px; background:#f8f9fa; border:1px solid #ccc; cursor:pointer;"
                    onclick="downloadSingle('${encodedLog}', 'log_${l.timestamp}.txt')">
                    このログを保存 (.txt)
                </button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <pre style="background:#2d2d2d; color:#ccc; padding:10px; font-size:11px; overflow-x:auto; white-space:pre-wrap;">${l.rawRequest}</pre>
                <pre style="background:#2d2d2d; color:#85adad; padding:10px; font-size:11px; overflow-x:auto; white-space:pre-wrap;">${l.rawResponse}</pre>
            </div>
        </div>`;
    }).join('');

    const allLogsJson = Buffer.from(JSON.stringify(accessLogs, null, 2)).toString('base64');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>SSRF Monitor</title>
        <meta charset="utf-8">
    </head>
    <body style="font-family:sans-serif; background:#f4f7f6; padding:20px;">
        <div style="max-width:1100px; margin:0 auto;">
            <div style="background:white; padding:20px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h1 style="margin:0;">SSRF Monitor</h1>
                <div>
                    <button style="padding:10px 20px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="location.reload()">更新</button>
                    <button style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="downloadAll()">全ログ一括保存 (.json)</button>
                    <button style="padding:10px 20px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="fetch('/admin/clear').then(()=>location.reload())">クリア</button>
                </div>
            </div>
            <div>${logCards || '<p style="text-align:center; color:#999;">ログ待機中...</p>'}</div>
        </div>

        <script>
            function downloadFile(contentBase64, fileName, contentType) {
                const binary = atob(contentBase64);
                const array = new Uint8Array(binary.length);
                for(let i=0; i<binary.length; i++) array[i] = binary.charCodeAt(i);
                const file = new Blob([array], {type: contentType});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(file);
                a.download = fileName;
                a.click();
            }

            function downloadSingle(base64Data, name) {
                downloadFile(base64Data, name, "text/plain");
            }

            function downloadAll() {
                const data = "${allLogsJson}";
                downloadFile(data, "ssrf_all_logs.json", "application/json");
            }
        </script>
    </body>
    </html>`;
    res.send(html);
});

app.get('/admin/clear', (req, res) => { accessLogs = []; res.send('ok'); });
app.get('/', (req, res) => res.send('Active'));
app.all('/log', (req, res) => res.send('Logged'));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`URL: http://localhost:${PORT}/admin`);
});