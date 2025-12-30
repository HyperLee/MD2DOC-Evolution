import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun,
  AlignmentType,
  UnderlineType,
  ShadingType
} from "docx";
import { ParsedBlock, BlockType } from "../types.ts";

// 單位換算常數 (1 cm ≒ 567 Twips)
const CM_TO_TWIPS = 567;

// 字體設定
const FONT_MAIN_CJK = "Microsoft JhengHei"; // 微軟正黑體
const FONT_MAIN_LATIN = "Consolas";

// 基礎字型設定
const FONT_CONFIG_NORMAL = {
  ascii: FONT_MAIN_LATIN,
  hAnsi: FONT_MAIN_LATIN,
  eastAsia: FONT_MAIN_CJK,
  cs: FONT_MAIN_LATIN
};

// 快捷鍵字型設定 (統一使用標準字體)
const FONT_CONFIG_SHORTCUT = {
  ascii: FONT_MAIN_LATIN,
  hAnsi: FONT_MAIN_LATIN,
  eastAsia: FONT_MAIN_CJK,
  cs: FONT_MAIN_LATIN
};

// 斜體字型設定 (統一使用標準字體，不使用標楷體)
const FONT_CONFIG_ITALIC = {
  ascii: FONT_MAIN_LATIN,
  hAnsi: FONT_MAIN_LATIN,
  eastAsia: FONT_MAIN_CJK, 
  cs: FONT_MAIN_LATIN
};

// 版面設定介面
export interface DocxConfig {
  widthCm: number;
  heightCm: number;
}

const parseInlineStyles = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  // Regex 順序：粗體 > 斜體 > 底線 > 程式碼 > UI按鈕 > 快捷鍵 > 書名號
  // 注意：Regex 特殊符號需跳脫
  const regex = /(\*\*.*?\*\*)|(\*.*?\*)|(<u>.*?<\/u>)|(`[^`]+`)|(【.*?】)|(\[.*?\])|(『.*?』)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 1. 處理匹配前的普通文字
    if (match.index > lastIndex) {
      runs.push(new TextRun({ 
        text: text.substring(lastIndex, match.index),
        font: FONT_CONFIG_NORMAL
      }));
    }

    const fullMatch = match[0];

    // 2. 判斷匹配類型並套用對應樣式
    if (fullMatch.startsWith('**')) {
      // 粗體
      runs.push(new TextRun({ 
        text: fullMatch.slice(2, -2), 
        bold: true,
        font: FONT_CONFIG_NORMAL
      }));
    } else if (fullMatch.startsWith('*')) {
      // 斜體：顏色深藍，Italic
      runs.push(new TextRun({ 
        text: fullMatch.slice(1, -1), 
        italics: true,
        color: "1E3A8A", // 深藍色
        font: FONT_CONFIG_ITALIC
      }));
    } else if (fullMatch.startsWith('<u>')) {
      // 底線：單線，藍色字
      runs.push(new TextRun({ 
        text: fullMatch.slice(3, -4), 
        color: "2563EB", // 亮藍色連結感
        underline: {
            type: UnderlineType.SINGLE,
            color: "2563EB"
        },
        font: FONT_CONFIG_NORMAL
      }));
    } else if (fullMatch.startsWith('`')) {
      // 行內程式碼
      runs.push(new TextRun({ 
        text: fullMatch.slice(1, -1), 
        font: FONT_CONFIG_NORMAL,
        shading: { fill: "F1F5F9", type: ShadingType.CLEAR, color: "auto" }
      }));
    } else if (fullMatch.startsWith('【')) {
      // UI 按鈕：加粗 + 背景
      runs.push(new TextRun({ 
        text: fullMatch, 
        bold: true,
        font: FONT_CONFIG_NORMAL,
        shading: { fill: "E2E8F0", type: ShadingType.CLEAR, color: "auto" }
      }));
    } else if (fullMatch.startsWith('[')) {
      // 快捷鍵：標準字體 + 外框感
      runs.push(new TextRun({ 
        text: fullMatch, 
        font: FONT_CONFIG_SHORTCUT,
        size: 20, // 稍微縮小一點
        shading: { fill: "F8FAFC", type: ShadingType.CLEAR, color: "auto" }
      }));
    } else if (fullMatch.startsWith('『')) {
      // 書籍/專案：加粗
      runs.push(new TextRun({ 
        text: fullMatch, 
        bold: true,
        font: FONT_CONFIG_NORMAL
      }));
    }

    lastIndex = regex.lastIndex;
  }

  // 3. 處理剩餘文字
  if (lastIndex < text.length) {
    runs.push(new TextRun({ 
      text: text.substring(lastIndex),
      font: FONT_CONFIG_NORMAL
    }));
  }
  return runs;
};

export const generateDocx = async (
    blocks: ParsedBlock[], 
    config: DocxConfig = { widthCm: 17, heightCm: 23 } // 預設為技術書籍大小
): Promise<Blob> => {
  const docChildren: any[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case BlockType.HEADING_1:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading1",
          spacing: { before: 480, after: 240 },
          border: { bottom: { style: "single", space: 8, color: "000000", size: 18 } }
        }));
        break;
      case BlockType.HEADING_2:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading2",
          spacing: { before: 400, after: 200 }
        }));
        break;
      case BlockType.HEADING_3:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading3",
          spacing: { before: 300, after: 150 }
        }));
        break;
      case BlockType.PARAGRAPH:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          spacing: { before: 200, after: 200 },
          alignment: AlignmentType.BOTH
        }));
        break;
      case BlockType.CODE_BLOCK:
        const codeLines = block.content.split('\n');
        docChildren.push(new Paragraph({
          children: codeLines.map((line, index) => new TextRun({
             text: line,
             font: FONT_CONFIG_NORMAL,
             size: 18,
             break: index > 0 ? 1 : undefined
          })),
          border: {
            top: { style: "single", space: 10, size: 6, color: "BFBFBF" },
            bottom: { style: "single", space: 10, size: 6, color: "BFBFBF" },
            left: { style: "single", space: 10, size: 6, color: "BFBFBF" },
            right: { style: "single", space: 10, size: 6, color: "BFBFBF" },
          },
          shading: { fill: "F8F9FA" },
          spacing: { before: 400, after: 400, line: 240 },
          indent: { left: 400, right: 400 }
        }));
        break;
      case BlockType.CHAT_USER:
      case BlockType.CHAT_AI:
        const isUser = block.type === BlockType.CHAT_USER;
        docChildren.push(new Paragraph({
          children: [
              new TextRun({ text: isUser ? "User:" : "AI:", bold: true, size: 18, font: FONT_CONFIG_NORMAL }),
              new TextRun({ text: "", break: 1 }),
              ...parseInlineStyles(block.content)
          ],
          border: {
            top: { style: isUser ? "dashed" : "dotted", space: 10, color: "404040" },
            bottom: { style: isUser ? "dashed" : "dotted", space: 10, color: "404040" },
            left: { style: isUser ? "dashed" : "dotted", space: 10, color: "404040" },
            right: { style: isUser ? "dashed" : "dotted", space: 10, color: "404040" },
          },
          // User: 靠右視覺 (左縮排大), AI: 靠左視覺 (右縮排大)
          indent: isUser ? { left: 1440 } : { right: 1440 }, 
          // User: 內容靠右對齊 (依需求), AI: 內容靠左
          alignment: isUser ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { before: 300, after: 300 },
          // AI: 淺灰底, User: 無底色(White/Clear)
          shading: { fill: isUser ? "FFFFFF" : "F2F2F2" }
        }));
        break;
      case BlockType.CALLOUT_TIP:
      case BlockType.CALLOUT_NOTE:
      case BlockType.CALLOUT_WARNING:
        let label = "NOTE";
        let borderColor = "94A3B8";
        let borderStyle: any = "single";
        let borderSize = 24;
        let shadingFill = "F8FAFC";

        if (block.type === BlockType.CALLOUT_TIP) {
          label = "TIP";
          borderColor = "64748B";
          borderStyle = "single";
          borderSize = 36;
          shadingFill = "F9FAFB";
        } else if (block.type === BlockType.CALLOUT_WARNING) {
          label = "WARNING";
          borderColor = "000000";
          borderStyle = "single"; // 實線
          borderSize = 48; // 粗線
          shadingFill = "F1F5F9";
        } else {
          // NOTE
          label = "NOTE";
          borderColor = "CBD5E1";
          borderStyle = "dashed"; // 虛線
          borderSize = 24;
          shadingFill = "FFFFFF";
        }

        // 構建 Callout 內容，使用 parseInlineStyles 以支援粗體/斜體等樣式
        const calloutChildren: TextRun[] = [];
        
        // 1. 標籤 (修正為乾淨的 [ TIP ] 樣式)
        calloutChildren.push(new TextRun({ 
            text: `[ ${label} ]`, 
            bold: true, 
            size: 18, 
            font: FONT_CONFIG_NORMAL 
        }));

        // 2. 內容 (逐行解析樣式)
        const lines = block.content.split('\n');
        lines.forEach((line) => {
            // 每一行前面都加一個換行符，與標題或上一行隔開
            calloutChildren.push(new TextRun({ text: "", break: 1 }));
            
            const styledRuns = parseInlineStyles(line);
            calloutChildren.push(...styledRuns);
        });

        docChildren.push(new Paragraph({
          children: calloutChildren,
          shading: { fill: shadingFill },
          border: { 
            top: { style: borderStyle, space: 5, size: borderSize, color: borderColor },
            bottom: { style: borderStyle, space: 5, size: borderSize, color: borderColor },
            left: { style: borderStyle, space: 15, size: borderSize, color: borderColor },
            right: { style: borderStyle, space: 15, size: borderSize, color: borderColor }
          },
          spacing: { before: 400, after: 400, line: 360 },
          indent: { left: 400, right: 400 }
        }));
        break;
      case BlockType.BULLET_LIST:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          bullet: { level: 0 },
          spacing: { before: 120, after: 120 }
        }));
        break;
      case BlockType.HORIZONTAL_RULE:
        docChildren.push(new Paragraph({
          text: "",
          border: {
            bottom: { style: "single", size: 12, color: "000000", space: 1 }
          },
          spacing: { before: 240, after: 240 }
        }));
        break;
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: config.widthCm * CM_TO_TWIPS,
            height: config.heightCm * CM_TO_TWIPS,
          },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 邊距維持約 2.54cm，可視需求調整
        },
      },
      children: docChildren
    }],
    styles: {
      default: {
        document: {
          run: { font: FONT_CONFIG_NORMAL, size: 22 },
        },
      },
    },
  });

  return await Packer.toBlob(doc);
};