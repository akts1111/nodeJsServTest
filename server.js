const express = require('express');
const app = express();

// 修正箇所: {*:path} を使用
// 5行目を以下に書き換えてください
app.all(/^(.*)$/, (req, res) => {
    console.log(`--- [${new Date().toISOString()}] New Request ---`);
    console.log(`Method: ${req.method} | Path: ${req.url}`);
    console.log(`Headers:`, req.headers);

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        if (body) console.log(`Body: ${body}`);
        console.log('--------------------------------------------\n');
        res.status(200).send('OK');
    });
});

app.listen(8080, '0.0.0.0', () => {
    console.log('Capture Server running on http://127.0.0.1:8080');
});