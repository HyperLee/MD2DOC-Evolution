# 客製化指南 (Customization Guide)

感謝您使用 **BookPublisher MD2Docx**！本專案設計之初就考慮到了擴充性，您可以根據自己的需求調整樣式、新增語法或修改 Word 輸出格式。

本指南將引導您如何打造專屬於您的版本。

## 🎯 目錄

1. [修改主題樣式 (顏色與字體)](#1-修改主題樣式-顏色與字體)
2. [調整 Word 版面設定](#2-調整-word-版面設定)
3. [新增 Markdown 語法](#3-新增-markdown-語法)
4. [修改預覽介面 (Preview UI)](#4-修改預覽介面-preview-ui)

---

## 1. 修改主題樣式 (顏色與字體)

專案中所有的核心樣式設定都集中在 `constants/theme.ts` 檔案中。這是最簡單的客製化方式。

**檔案路徑**: `constants/theme.ts`

### 修改字體
如果您希望輸出的 Word 文件使用不同字體（例如英文改用 Times New Roman），請修改 `FONTS` 物件：

```typescript
export const FONTS = {
  CJK: "Microsoft JhengHei", // 中文字體 (建議維持微軟正黑體以確保相容性)
  LATIN: "Times New Roman",  // 英文字體
};
```

### 修改顏色
您可以調整各種元素的顏色，例如將強調色改為紅色系：

```typescript
export const COLORS = {
  // ... 其他設定
  PRIMARY_BLUE: "DC2626", // 修改斜體強調色為紅色
  LINK_BLUE: "DC2626",    // 修改連結底線色為紅色
  
  // Callout 提示框顏色
  CALLOUT: {
    TIP: {
      BORDER: "64748B",
      BG: "F0F9FF" // 改為淺藍色背景
    },
    // ...
  }
};
```

---

## 2. 調整 Word 版面設定

Word 輸出的具體排版邏輯（行距、邊框樣式、段落間距）位於 `services/docxGenerator.ts`。

**檔案路徑**: `services/docxGenerator.ts`

### 範例：修改標題樣式
找到 `BlockType.HEADING_1` 的區塊，您可以調整 `spacing` (間距) 或 `border` (邊框)：

```typescript
case BlockType.HEADING_1:
  docChildren.push(new Paragraph({
    children: parseInlineStyles(block.content),
    heading: "Heading1",
    spacing: { before: 480, after: 240 }, // 調整段前段後距離
    // 修改底部邊框樣式
    border: { bottom: { style: "double", space: 8, color: COLORS.BLACK, size: 18 } } 
  }));
  break;
```

---

## 3. 新增 Markdown 語法

如果您需要支援新的語法（例如：螢光筆標記 `==text==`），需要修改三個地方：

### 步驟 1: 定義新的樣式類型
在 `utils/styleParser.ts` 中新增類型與 Regex：

```typescript
export enum InlineStyleType {
  // ...
  HIGHLIGHT = 'HIGHLIGHT', // 新增類型
}

export const parseInlineElements = (text: string): InlineStyleSegment[] => {
  // 新增 regex group: (==.*?==)
  const regex = /(\*\*.*?\*\*)|...|(==.*?==)/g; 
  
  // ... 在迴圈中處理匹配
  if (fullMatch.startsWith('==')) {
      type = InlineStyleType.HIGHLIGHT;
      content = fullMatch.slice(2, -2);
  }
  // ...
}
```

### 步驟 2: 實作 Word 輸出邏輯
在 `services/docxGenerator.ts` 的 `parseInlineStyles` 函數中加入對應處理：

```typescript
case InlineStyleType.HIGHLIGHT:
  return new TextRun({ 
    text: segment.content, 
    highlight: "yellow", // Word 螢光筆效果
    font: FONT_CONFIG_NORMAL
  });
```

### 步驟 3: 實作網頁預覽邏輯
在 `components/MarkdownEditor.tsx` 的 `RenderRichText` 元件中加入 React 渲染邏輯：

```typescript
case InlineStyleType.HIGHLIGHT:
  return <span key={i} className="bg-yellow-200">{segment.content}</span>;
```

---

## 4. 修改預覽介面 (Preview UI)

預覽介面使用 **Tailwind CSS** 進行樣式設計。您可以在 `components/MarkdownEditor.tsx` 中直接修改 `PreviewBlock` 元件的 `className`。

**注意**: 修改這裡只會改變網頁上的視覺效果，**不會**影響匯出的 Word 檔案。請確保這裡的修改與 `docxGenerator.ts` 中的設定保持視覺一致 (WYSIWYG)。

---

## ❓ 常見問題

**Q: 為什麼修改了 `theme.ts` 的顏色，網頁預覽沒有變？**
A: `theme.ts` 主要控制 **Word 匯出** 的顏色。網頁預覽使用 Tailwind CSS class（如 `text-blue-600`）。若要保持一致，請同時修改 `MarkdownEditor.tsx` 中的 Tailwind class。

**Q: 支援自定義頁首頁尾嗎？**
A: 目前版本尚未內建頁首頁尾編輯器，但您可以直接在 `services/docxGenerator.ts` 的 `Document` 建構式中加入 `headers` 或 `footers` 屬性。

---

希望這份指南能幫助您打造出理想的出版工具！
Happy Writing & Coding! 🚀
