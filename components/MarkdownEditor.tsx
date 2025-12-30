import React, { useState, useEffect } from 'react';
import { Download, FileText, Sparkles } from 'lucide-react';
import saveAs from 'file-saver';
import { parseMarkdown } from '../services/markdownParser.ts';
import { generateDocx } from '../services/docxGenerator.ts';
import { BlockType, ParsedBlock } from '../types.ts';

const INITIAL_CONTENT = `# 第1章：啟程——為什麼你需要「文件」與「魔法」？

## 1.1 Vibe Coding 的真諦：你是指揮家，不是打字員

最近在技術圈有個詞紅到發紫，叫做 **「Vibe Coding」**。
這是什麼意思？表面上翻譯叫做「氛圍編碼」，但我們用更直白的話來說，就是**「跟著感覺寫程式」**。

User：**「嘿 Gemini，我要一個深色模式的登入頁面，按鈕要帶點賽博龐克（Cyberpunk）的霓虹光。」**

幾秒鐘後，咻！程式碼吐出來了。

> [!NOTE]
> **【ChiYu 的專業小補充】**
> 既然我們要寫文件，就要有專業的樣子。我們給文件標上版本號，例如 \`v1.0.0\`。這遵循 Semantic Versioning (語義化版本)。
`;

const MarkdownEditor: React.FC = () => {
  const [content, setContent] = useState(INITIAL_CONTENT);
  const [parsedBlocks, setParsedBlocks] = useState<ParsedBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 當內容變動時，即時解析 Markdown 區塊供預覽使用
  useEffect(() => {
    try {
      const blocks = parseMarkdown(content);
      setParsedBlocks(blocks);
    } catch (e) {
      console.error("Markdown 解析出錯:", e);
    }
  }, [content]);

  const handleDownload = async () => {
    if (parsedBlocks.length === 0) return;
    setIsGenerating(true);
    try {
      const blob = await generateDocx(parsedBlocks);
      saveAs(blob, "Technical_Manuscript.docx");
    } catch (error) {
      console.error("Word 轉檔失敗:", error);
      alert("轉檔失敗，請確認內容格式是否正確。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* 導覽列 */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-2.5 rounded-xl">
            <FileText className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">BookPublisher <span className="text-slate-400 font-normal">MD2Docx</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">核心引擎：Markdown -> Word (v1.0)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownload}
            disabled={isGenerating || parsedBlocks.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:bg-slate-300"
          >
            {isGenerating ? '正在轉換...' : '匯出 Word'}
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 主介面 */}
      <main className="flex flex-1 overflow-hidden">
        {/* 編輯器 */}
        <div className="w-1/2 flex flex-col border-r border-slate-200 bg-white">
          <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Manuscript Editor (Draft)
          </div>
          <textarea
            className="flex-1 w-full p-10 resize-none focus:outline-none text-base leading-[1.8] text-slate-700 selection:bg-indigo-100"
            style={{ fontFamily: '"Consolas", "Microsoft JhengHei", sans-serif' }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            placeholder="在此輸入您的 Markdown 稿件..."
          />
        </div>

        {/* 預覽區 */}
        <div className="w-1/2 flex flex-col bg-slate-100/50">
          <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Print Layout Preview (WYSIWYG)
          </div>
          <div className="flex-1 overflow-y-auto p-12 lg:p-16 scroll-smooth">
            <div 
              className="max-w-2xl mx-auto bg-white shadow-2xl p-16 lg:p-20 min-h-screen text-slate-900 rounded-sm border border-slate-200"
              style={{ fontFamily: '"Consolas", "Microsoft JhengHei", sans-serif' }}
            >
              {parsedBlocks.length > 0 ? (
                parsedBlocks.map((block, idx) => (
                  <PreviewBlock key={idx} block={block} />
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 mt-20 opacity-30">
                  <Sparkles className="w-12 h-12 mb-4" />
                  <p className="font-bold tracking-widest">等待輸入內容...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const PreviewBlock: React.FC<{ block: ParsedBlock }> = ({ block }) => {
  const renderRichText = (text: string) => {
    // 支援粗體、行內程式碼、介面括號
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|【.*?】)/g);
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 border-b-2 border-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-[0.9em] font-mono text-indigo-700 border border-slate-200">{part.slice(1, -1)}</code>;
      }
      if (part.startsWith('【') && part.endsWith('】')) {
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 mx-1 text-[0.7rem] font-black border-2 border-slate-900 rounded bg-slate-50 shadow-[2px_2px_0_0_#000]">
            {part.slice(1, -1)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  switch (block.type) {
    case BlockType.HEADING_1:
      return <h1 className="text-4xl font-black mb-12 mt-16 pb-4 border-b-4 border-slate-900 tracking-tight leading-tight">{renderRichText(block.content)}</h1>;
    case BlockType.HEADING_2:
      return <h2 className="text-2xl font-black mb-8 mt-12 tracking-tight flex items-center gap-3 before:w-2 before:h-8 before:bg-indigo-600">{renderRichText(block.content)}</h2>;
    case BlockType.HEADING_3:
      return <h3 className="text-xl font-bold mb-6 mt-10 text-slate-800 underline decoration-indigo-200 underline-offset-8 decoration-4">{renderRichText(block.content)}</h3>;
    case BlockType.CODE_BLOCK:
      return (
        <div className="my-10 border-2 border-slate-900 bg-slate-50 p-8 rounded shadow-[8px_8px_0_0_#e2e8f0]">
          <pre className="text-sm font-mono whitespace-pre text-slate-900 leading-relaxed overflow-x-auto">{block.content}</pre>
        </div>
      );
    case BlockType.CHAT_USER:
      return (
        <div className="flex justify-end my-12 pl-20">
          <div className="w-full border-2 border-dashed border-slate-900 p-6 bg-white relative">
            <div className="absolute -top-3 left-4 bg-white px-2 text-[10px] font-black tracking-widest text-indigo-600">USER</div>
            <div className="whitespace-pre-wrap leading-[1.8]">{renderRichText(block.content)}</div>
          </div>
        </div>
      );
    case BlockType.CHAT_AI:
      return (
        <div className="flex justify-start my-12 pr-20">
          <div className="w-full border-2 border-dotted border-slate-900 p-6 bg-slate-50 relative">
            <div className="absolute -top-3 right-4 bg-slate-50 px-2 text-[10px] font-black tracking-widest text-indigo-600">AI RESPONSE</div>
            <div className="whitespace-pre-wrap leading-[1.8] text-slate-800">{renderRichText(block.content)}</div>
          </div>
        </div>
      );
    case BlockType.CALLOUT_TIP:
    case BlockType.CALLOUT_NOTE:
    case BlockType.CALLOUT_WARNING:
      return (
        <div className="my-14 p-8 bg-slate-50 border-l-[12px] border-indigo-600 shadow-sm">
          <div className="font-black text-[10px] mb-4 tracking-[0.3em] uppercase opacity-40">Section Note</div>
          <div className="whitespace-pre-wrap leading-[1.8] text-slate-800">{renderRichText(block.content)}</div>
        </div>
      );
    case BlockType.BULLET_LIST:
      return <li className="ml-8 list-none relative mb-4 pl-4 leading-[1.8] before:content-[''] before:absolute before:left-0 before:top-[0.7em] before:w-2 before:h-2 before:bg-indigo-400 before:rounded-full">{renderRichText(block.content)}</li>;
    default:
      return <p className="mb-8 leading-[2.1] text-justify text-slate-800 tracking-tight">{renderRichText(block.content)}</p>;
  }
};

export default MarkdownEditor;
