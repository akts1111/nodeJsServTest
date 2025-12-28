※以下はローカル環境内での暫定版。ngrokなど公開サーバーに置いた後、修正や手順変更の可能性あり

## 前提条件
- Node.jsをインストールしていること
- バージョン[v24.12.0]で動作確認している

## 準備
**./nodeJsServTest/express-ssrf2** 配下で以下コマンド
```
# 初期化とモジュールのインポート
npm init -y && npm install express
```

## 使用方法
### 起動方法
**./nodeJsServTest/** 配下で以下コマンド
```
npm run start:express2
```

### URL
- 管理画面（基本的にこの画面を使用する）
```
http://localhost:3001/admin
```

![alt text](image.png)

- アクセス監視用(このURLに対するアクセスを監視する)
```
http://localhost:3001/log?test=hello
```

![alt text](image-1.png)
