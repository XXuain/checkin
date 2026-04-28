# checkin2.0 · 鮮果氣泡飲品項一覽

靜態網頁讀取 `data/mojito-water.json` 與 `data/sugar.json`，請用本機 HTTP 開啟專案目錄（勿用 `file://` 直接開 `index.html`，否則可能無法載入 JSON）。

## 啟動方式（擇一）

### Python（macOS 常見已內建）

```bash
cd checkin
python3 -m http.server 8765
```

瀏覽器開：<http://127.0.0.1:8765>

### Node.js（若有安裝 npx）

```bash
cd checkin2.0
npx --yes serve .
```

依終端機顯示的網址（通常為 `http://localhost:3000`）開啟。

## 檔案說明

| 路徑                     | 說明                                                                           |
| ------------------------ | ------------------------------------------------------------------------------ |
| `index.html`             | 入口頁                                                                         |
| `app.js`                 | 載入資料與組版                                                                 |
| `styles.css`             | 樣式                                                                           |
| `data/mojito-water.json` | 品項、步驟、共用步驟文案                                                       |
| `data/sugar.json`        | 糖階、每組 `sugar_presets` 內含「標準糖分 `base`」與「加料減糖 `with_add_on`」 |
