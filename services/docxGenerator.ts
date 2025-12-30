import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun
} from "docx";
import { ParsedBlock, BlockType } from "../types.ts";

const MAIN_FONT_CJK = "Microsoft JhengHei";
const MAIN_FONT_LATIN = "Consolas";

// 專業字體配置：確保拉丁字元與中文字元分開處理
const FONT_CONFIG = {
  ascii: MAIN_FONT_LATIN,
  hAnsi: MAIN_FONT_LATIN,
  eastAsia: MAIN_FONT_CJK,
  cs: MAIN_FONT_LATIN
};

const parseInlineStyles = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  const regex = /(\*\*.*?\*\*)|(`[^`]+`)|(【.*?】)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ 
        text: text.substring(lastIndex, match.index),
        font: FONT_CONFIG
      }));
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      runs.push(new TextRun({ 
        text: fullMatch.slice(2, -2), 
        bold: true,
        font: FONT_CONFIG
      }));
    } else if (fullMatch.startsWith('`')) {
      runs.push(new TextRun({ 
        text: fullMatch.slice(1, -1), 
        font: FONT_CONFIG,
        shading: { fill: "F2F2F2" }
      }));
    } else if (fullMatch.startsWith('【')) {
      runs.push(new TextRun({ 
        text: fullMatch, 
        bold: true,
        font: FONT_CONFIG
      }));
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({ 
      text: text.substring(lastIndex),
      font: FONT_CONFIG
    }));
  }
  return runs;
};

export const generateDocx = async (blocks: ParsedBlock[]): Promise<Blob> => {
  const docChildren: any[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case BlockType.HEADING_1:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading1",
          spacing: { before: 400, after: 200 },
          border: { bottom: { style: "single", space: 6, color: "000000", size: 12 } }
        }));
        break;
      case BlockType.HEADING_2:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading2",
          spacing: { before: 300, after: 150 }
        }));
        break;
      case BlockType.HEADING_3:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          heading: "Heading3",
          spacing: { before: 200, after: 100 }
        }));
        break;
      case BlockType.PARAGRAPH:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          spacing: { before: 180, after: 180 },
          alignment: "both" // "both" 是 Word 中 justified 的標準值
        }));
        break;
      case BlockType.CODE_BLOCK:
        const codeLines = block.content.split('\n');
        docChildren.push(new Paragraph({
          children: codeLines.map((line, index) => new TextRun({
             text: line,
             font: FONT_CONFIG,
             size: 19,
             break: index > 0 ? 1 : undefined
          })),
          border: {
            top: { style: "single", space: 6 },
            bottom: { style: "single", space: 6 },
            left: { style: "single", space: 6 },
            right: { style: "single", space: 6 },
          },
          shading: { fill: "F7F7F7" },
          spacing: { before: 300, after: 300, line: 240 },
          indent: { left: 400, right: 400 }
        }));
        break;
      case BlockType.CHAT_USER:
      case BlockType.CHAT_AI:
        const isUser = block.type === BlockType.CHAT_USER;
        docChildren.push(new Paragraph({
          children: [
              new TextRun({ text: isUser ? "User:" : "AI:", bold: true, size: 18, font: FONT_CONFIG }),
              new TextRun({ text: "", break: 1 }),
              ...parseInlineStyles(block.content)
          ],
          border: {
            top: { style: isUser ? "dashed" : "dotted", space: 10 },
            bottom: { style: isUser ? "dashed" : "dotted", space: 10 },
            left: { style: isUser ? "dashed" : "dotted", space: 10 },
            right: { style: isUser ? "dashed" : "dotted", space: 10 },
          },
          indent: isUser ? { left: 1500 } : { right: 1500 },
          spacing: { before: 300, after: 300 },
          shading: { fill: isUser ? "FFFFFF" : "F2F2F2" }
        }));
        break;
      case BlockType.CALLOUT_TIP:
      case BlockType.CALLOUT_NOTE:
      case BlockType.CALLOUT_WARNING:
        docChildren.push(new Paragraph({
          children: block.content.split('\n').map((l, i) => new TextRun({ text: l, font: FONT_CONFIG, break: i > 0 ? 1 : 0 })),
          shading: { fill: "F9F9F9" },
          border: { left: { style: "single", space: 15, size: 36, color: "000000" } },
          spacing: { before: 400, after: 400 },
          indent: { left: 400 }
        }));
        break;
      case BlockType.BULLET_LIST:
        docChildren.push(new Paragraph({
          children: parseInlineStyles(block.content),
          bullet: { level: 0 },
          spacing: { before: 100, after: 100 }
        }));
        break;
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }],
    styles: {
      default: {
        document: {
          run: { font: FONT_CONFIG, size: 22 },
        },
      },
    },
  });

  return await Packer.toBlob(doc);
};