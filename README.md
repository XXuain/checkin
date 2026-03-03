# 飲料成分表・模擬點餐

網頁版成分表與模擬點餐練習，供新進員工背誦與複習。

## 功能

- **成分表查詢**：依大類 → 品項瀏覽完整糖量、冰塊量、茶量、步驟與備註。
- **背誦／複習**：閃卡模式或遮罩複習，可依大類或「僅人氣推薦」篩選。
- **模擬點餐**：選擇飲料與甜度／冰量／加料後送出，可顯示正確配方與步驟（練習模式），或先隱藏再顯示答案（測驗模式）。

## 技術

- Vue 3 + Vite + Vue Router
- 資料來源：`public/menu.json`（可依 PDF 與店內 SOP 擴充）

## 開發與建置

```bash
npm install
npm run dev    # 開發伺服器
npm run build  # 產出 dist/
npm run preview # 預覽建置結果
```

## 資料格式

- `categories`：大類（id、name、subtitle、commonNotes）
- `items`：品項（id、name、categoryId、price、recipeId、icons、canAddTopping）
- `recipes`：配方（sugarLevels、iceAmounts、teaAmounts、iceSteps、hotSteps、toppingSteps、notes）
- `toppings`：加料（id、name、addPrice）

擴充品項時請對齊 PDF 成分表與顧客菜單，並由店長或資深員工校對。
