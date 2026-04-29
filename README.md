# checkin2.0 · 鮮果氣泡飲品項一覽

靜態網頁讀取 `data/mojito.json` 與 `data/sugar.json`，請用本機 HTTP 開啟專案目錄（勿用 `file://` 直接開 `index.html`，否則可能無法載入 JSON）。

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

## 專案結構（品項頁擴充中）

- `pages/`：各分類品項一覽 HTML（目標 8 頁；目前含 `mojito.html`、`fruity.html`），路徑以 `../data/`、`../app.js` 讀取專案根目錄資源。
- `js/item-list/`：品項列表共用邏輯（渲染、篩選、`main`）；根目錄 `app.js` 僅 `import` 此模組，之後新增頁面不必複製 JS。
- `data/`：JSON 資料（糖分、品項、冰量等）。

## 檔案說明

| 路徑                      | 說明                                                                           |
| ------------------------- | ------------------------------------------------------------------------------ |
| `index.html`              | 入口頁                                                                         |
| `pages/*.html`            | 分類品項頁（例如 `pages/mojito.html`、`pages/fruity.html`）                    |
| `app.js`                  | 品項頁入口：載入 `js/item-list/main.js`                                        |
| `js/item-list/main.js`    | 載入 JSON、篩選器、列表渲染                                                    |
| `js/item-list/render.js`  | 卡片與糖／茶／冰區塊 HTML                                                      |
| `js/item-list/filters.js` | 糖分／茶量篩選選項邏輯                                                         |
| `styles.css`              | 樣式                                                                           |
| `data/mojito.json`        | 品項、步驟、共用步驟文案                                                       |
| `data/sugar.json`         | 糖階、每組 `sugar_presets` 內含「標準糖分 `base`」與「加料減糖 `with_add_on`」 |

```graph TD
A[進入品項: 例如 巧克力歐蕾] --> B{選擇規格}
B --> C[冰/熱選擇]
B --> D[加料/不加料]

    C --> C1[冰: 顯示冰塊顆數與冷飲流程]
    C --> C2[熱: 顯示加熱步驟與熱水比例]

    D --> D1[一般: 顯示標準奶量 300/350/400]
    D --> D2[加料: 自動換算減量後的奶量 200/250/300]

    C1 & C2 & D1 & D2 --> E[最終作業步驟清單]
```
