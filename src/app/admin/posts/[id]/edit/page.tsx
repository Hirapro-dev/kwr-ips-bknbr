"use client";

import { useState, useRef, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FiSave, FiEye, FiArrowLeft, FiUploadCloud, FiClock } from "react-icons/fi";
import { compressAndUpload } from "@/lib/upload";
import { prettyPrintHtml } from "@/lib/editor-html";
import EditorToolbar from "@/components/EditorToolbar";

type EditorMode = "visual" | "code";
type CustomEditor = { id: number; name: string; icon: string; html: string };

export default function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [eyecatch, setEyecatch] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<EditorMode>("visual");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [eyecatchDragOver, setEyecatchDragOver] = useState(false);
  const [editorDragOver, setEditorDragOver] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);
  const [customEditors, setCustomEditors] = useState<CustomEditor[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [buttonText, setButtonText] = useState("詳しくはこちら");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonNewTab, setButtonNewTab] = useState(true);
  const [buttonColor, setButtonColor] = useState("#1e40af");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eyecatchInputRef = useRef<HTMLInputElement>(null);
  const lastEnterInBlock = useRef<{ time: number; node: Node | null }>({ time: 0, node: null });
  const savedSelectionRef = useRef<Range | null>(null);

  useEffect(() => {
    const init = async () => {
      const authRes = await fetch("/api/auth/me");
      if (!authRes.ok) { router.push("/admin/login"); return; }
      const res = await fetch(`/api/posts/${id}`);
      if (res.ok) {
        const post = await res.json();
        setTitle(post.title); setContent(post.content); setEyecatch(post.eyecatch || ""); setPublished(post.published);
        if (post.scheduledAt) { setScheduledAt(new Date(post.scheduledAt).toISOString().slice(0, 16)); setShowSchedule(true); }
      }
      const ceRes = await fetch("/api/custom-editors");
      if (ceRes.ok) setCustomEditors(await ceRes.json());
      setLoading(false);
    };
    init();
  }, [id, router]);

  useEffect(() => {
    if (!loading && mode === "visual" && editorRef.current) editorRef.current.innerHTML = content;
  }, [loading, mode]);

  const syncFromVisual = () => { if (editorRef.current) setContent(editorRef.current.innerHTML); };

  // ブロック要素（引用・注釈）を取得
  const getQuoteOrNoteBlock = (): HTMLElement | null => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (tag === "blockquote" || (tag === "div" && node.style.borderLeft)) return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  // ブロック末尾の空ノードを削除（2回目Enterで脱出時のクリーンアップ）
  const removeTrailingEmptyFromBlock = (blockEl: HTMLElement) => {
    while (blockEl.lastChild) {
      const last = blockEl.lastChild;
      const empty =
        (last instanceof HTMLElement && last.tagName === "BR") ||
        (last instanceof HTMLElement && (last.tagName === "DIV" || last.tagName === "BLOCKQUOTE") && last.innerHTML.replace(/<br\s*\/?>/gi, "").trim() === "") ||
        (last.nodeType === Node.TEXT_NODE && !last.textContent?.trim());
      if (!empty) break;
      blockEl.removeChild(last);
    }
  };

  // ワードプレス風: Enter=段落(<p>)、Cmd+Enter=改行(<br>)。引用・注釈内は改行2回で解除。
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;

    const blockEl = getQuoteOrNoteBlock();

    // Cmd+Enter → 改行（<br>）のみ
    if (e.metaKey) {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br>");
      syncFromVisual();
      return;
    }

    // 引用・注釈ブロック内: 2回目のEnterで脱出
    if (blockEl) {
      const now = Date.now();
      const prev = lastEnterInBlock.current;
      if (prev.node === blockEl && now - prev.time < 1200) {
        e.preventDefault();
        removeTrailingEmptyFromBlock(blockEl);
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        blockEl.parentNode?.insertBefore(p, blockEl.nextSibling);
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        lastEnterInBlock.current = { time: 0, node: null };
        syncFromVisual();
        return;
      }
      lastEnterInBlock.current = { time: now, node: blockEl };
      return;
    }

    // 通常時: Enterで新段落。insertParagraph のあと div を p に正規化
    lastEnterInBlock.current = { time: 0, node: null };
    e.preventDefault();
    document.execCommand("insertParagraph", false);
    const anchor = sel.anchorNode;
    if (!anchor) { syncFromVisual(); return; }
    let block: HTMLElement | null = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    while (block && block !== editorRef.current && !["P", "DIV", "H1", "H2", "H3", "H4"].includes(block.tagName)) block = block.parentElement;
    if (block && block !== editorRef.current && block.tagName === "DIV") {
      const p = document.createElement("p");
      while (block.firstChild) p.appendChild(block.firstChild);
      block.parentNode?.replaceChild(p, block);
    }
    syncFromVisual();
  };

  const execCommand = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); syncFromVisual(); };
  const insertHeading = (lv: number) => { document.execCommand("formatBlock", false, `h${lv}`); editorRef.current?.focus(); syncFromVisual(); };
  const saveSelection = () => {
    const sel = window.getSelection();
    const editor = editorRef.current;
    if (sel?.rangeCount && editor?.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    } else savedSelectionRef.current = null;
  };
  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor || !savedSelectionRef.current) return false;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(savedSelectionRef.current);
    savedSelectionRef.current = null;
    return true;
  };

  const insertLink = () => {
    if (mode === "visual") saveSelection();
    setLinkUrl(""); setLinkNewTab(false); setLinkDialogOpen(true);
  };
  const submitLink = () => {
    const u = linkUrl.trim();
    if (!u) return;
    setLinkDialogOpen(false);
    if (mode === "visual" && editorRef.current) {
      if (!restoreSelection()) return;
      document.execCommand("createLink", false, u);
      if (linkNewTab) {
        const sel = window.getSelection();
        if (sel?.rangeCount) {
          let node: Node | null = sel.anchorNode;
          while (node && node !== editorRef.current) {
            if (node instanceof HTMLAnchorElement) { node.target = "_blank"; node.rel = "noopener noreferrer"; break; }
            node = node.parentNode;
          }
        }
      }
      syncFromVisual();
    } else setContent((p) => p + (p.trim() ? "\n\n" : "") + `<a href="${u}"${linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : ""}>リンク</a>\n\n`);
  };

  const insertHtml = (html: string) => {
    if (mode === "visual") { document.execCommand("insertHTML", false, html); syncFromVisual(); }
    else setContent((p) => (p.trim() ? p.trimEnd() + "\n\n" : "") + html + "\n\n");
  };

  const insertYoutube = () => {
    const u = prompt("YouTubeのURLを入力:"); if (!u) return;
    const m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (!m) { alert("有効なYouTube URLを入力してください"); return; }
    insertHtml(`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;margin:1.5rem 0;border-radius:0.5rem;"><iframe src="https://www.youtube.com/embed/${m[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div>`);
  };

  const insertNote = (color = "#3b82f6") => {
    const t = prompt("注釈テキスト:"); if (!t) return;
    insertHtml(`<div style="background:${color}10;border-left:4px solid ${color};padding:1rem 1.25rem;margin:1.5rem 0;border-radius:0 0.5rem 0.5rem 0;font-size:0.9rem;"><strong>📝 注釈:</strong> ${t}</div>`);
  };
  const insertQuote = (color = "#3b82f6") => {
    const t = prompt("引用テキスト:"); if (!t) return; const s = prompt("引用元（任意）:");
    insertHtml(`<blockquote style="border-left:4px solid ${color};padding:1rem 1.25rem;margin:1.5rem 0;background:#f8fafc;border-radius:0 0.5rem 0.5rem 0;color:#64748b;font-style:italic;">${t}${s ? `<br/><cite style="font-size:0.85rem;color:#94a3b8;">― ${s}</cite>` : ""}</blockquote>`);
  };
  const insertButton = (color = "#1e40af") => {
    if (mode === "visual") saveSelection();
    setButtonText("詳しくはこちら"); setButtonUrl(""); setButtonNewTab(true); setButtonColor(color); setButtonDialogOpen(true);
  };
  const submitButton = () => {
    const t = buttonText.trim();
    const u = buttonUrl.trim();
    if (!t || !u) return;
    setButtonDialogOpen(false);
    const targetAttr = buttonNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    const html = `<div style="text-align:center;margin:1.5rem 0;"><a href="${u}"${targetAttr} style="display:inline-block;background:${buttonColor};color:#fff;padding:0.75rem 2rem;border-radius:0.5rem;font-weight:600;text-decoration:none;">${t}</a></div>`;
    if (mode === "visual" && editorRef.current) {
      if (restoreSelection()) {
        document.execCommand("insertHTML", false, html);
        syncFromVisual();
      } else setContent((p) => (p.trim() ? p.trimEnd() + "\n\n" : "") + html + "\n\n");
    } else setContent((p) => (p.trim() ? p.trimEnd() + "\n\n" : "") + html + "\n\n");
  };

  const insertImageToEditor = useCallback(async (file: File) => {
    setUploading(true); setUploadProgress("圧縮中...");
    try { const url = await compressAndUpload(file); setUploadProgress(""); insertHtml(`<img src="${url}" alt="${file.name}" />`); }
    catch (e) { alert(e instanceof Error ? e.message : "失敗"); setUploadProgress(""); }
    finally { setUploading(false); }
  }, [mode]);

  const uploadEyecatch = useCallback(async (file: File) => {
    setUploading(true); setUploadProgress("圧縮中...");
    try { const url = await compressAndUpload(file); setEyecatch(url); setUploadProgress(""); }
    catch (e) { alert(e instanceof Error ? e.message : "失敗"); setUploadProgress(""); }
    finally { setUploading(false); }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) insertImageToEditor(f); e.target.value = ""; };
  const handleEyecatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) uploadEyecatch(f); e.target.value = ""; };
  const getImageFile = (e: React.DragEvent): File | null => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; return f?.type.startsWith("image/") ? f : null; };
  const handleEyecatchDrop = (e: React.DragEvent) => { setEyecatchDragOver(false); const f = getImageFile(e); if (f) uploadEyecatch(f); };
  const handleEditorDrop = (e: React.DragEvent) => { setEditorDragOver(false); const f = getImageFile(e); if (f) { e.stopPropagation(); insertImageToEditor(f); } };

  const handleSave = async (shouldPublish?: boolean) => {
    if (!title.trim()) { alert("タイトルを入力してください"); return; }
    if (mode === "visual" && editorRef.current) syncFromVisual();
    setSaving(true);
    try {
      const finalContent = mode === "visual" && editorRef.current ? editorRef.current.innerHTML : content;
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: finalContent, eyecatch: eyecatch || null, published: shouldPublish ?? published, scheduledAt: scheduledAt || null }),
      });
      if (res.ok) router.push("/admin/dashboard");
      else { const d = await res.json(); alert(d.error || "保存に失敗"); }
    } catch { alert("保存に失敗"); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400">読み込み中...</p></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin/dashboard")} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg"><FiArrowLeft size={18} /></button>
            <span className="font-bold text-sm text-slate-900">記事を編集</span>
          </div>
          <div className="flex items-center gap-2">
            {uploadProgress && <span className="text-xs text-blue-600 animate-pulse mr-2">{uploadProgress}</span>}
            <button onClick={() => setShowSchedule(!showSchedule)} className={`p-2 rounded-lg transition-colors ${showSchedule ? "text-amber-600 bg-amber-50" : "text-slate-400 hover:text-amber-600"}`} title="公開日時を指定（未来なら予約）"><FiClock size={16} /></button>
            <button onClick={() => handleSave(false)} disabled={saving || uploading} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1"><FiSave size={13} /> 下書き</button>
            <button onClick={() => handleSave(true)} disabled={saving || uploading} className="px-3 py-1.5 text-xs bg-black hover:bg-black/80 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"><FiEye size={13} /> 公開</button>
          </div>
        </div>
        {showSchedule && (
          <div className="bg-amber-50 border-t border-amber-200 px-4 py-2.5 flex flex-wrap items-center gap-3">
            <FiClock size={14} className="text-amber-600" />
            <span className="text-xs text-amber-700 font-medium">公開日時:</span>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="text-xs border border-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500" />
            {scheduledAt && <button onClick={() => { setScheduledAt(""); setShowSchedule(false); }} className="text-xs text-amber-600 hover:text-amber-800">クリア</button>}
            <span className="text-[11px] text-amber-700/80">未指定または過去＝今すぐ公開、未来の日時＝自動で公開予約になります</span>
          </div>
        )}
      </header>

      <EditorToolbar mode={mode} uploading={uploading} customEditors={customEditors}
        onToggleMode={() => {
          if (mode === "visual") {
            syncFromVisual();
            const raw = editorRef.current?.innerHTML ?? content;
            setContent(prettyPrintHtml(raw));
          }
          setMode(mode === "visual" ? "code" : "visual");
        }}
        onExecCommand={execCommand} onInsertHeading={insertHeading} onInsertLink={insertLink}
        onInsertImage={() => fileInputRef.current?.click()} onInsertYoutube={insertYoutube}
        onInsertNote={insertNote} onInsertQuote={insertQuote} onInsertButton={insertButton}
        onInsertCustomHtml={insertHtml} />

      <main className="max-w-4xl mx-auto px-4 py-8" style={{ paddingTop: showSchedule ? "160px" : "124px" }}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="記事タイトルを入力..."
          className="w-full text-2xl md:text-3xl font-black border-none outline-none bg-transparent mb-6 placeholder:text-slate-300" />

        <div className="mb-6">
          <label className="block text-xs font-semibold text-slate-500 mb-2">アイキャッチ画像</label>
          {eyecatch ? (
            <div className="relative rounded-lg overflow-hidden border border-slate-200">
              <div className="aspect-[16/9] relative"><Image src={eyecatch} alt="アイキャッチ" fill className="object-cover" sizes="800px" /></div>
              <button onClick={() => setEyecatch("")} className="absolute top-3 right-3 bg-white/90 hover:bg-white text-red-500 px-3 py-1 rounded-lg text-xs font-medium shadow-sm">削除</button>
            </div>
          ) : (
            <div onClick={() => eyecatchInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setEyecatchDragOver(true); }} onDragLeave={() => setEyecatchDragOver(false)} onDrop={handleEyecatchDrop}
              className={`w-full border-2 border-dashed rounded-lg py-10 flex flex-col items-center gap-2 cursor-pointer transition-colors ${eyecatchDragOver ? "border-blue-400 bg-blue-50/50" : "border-slate-200 hover:border-blue-400"}`}>
              {uploading ? <><div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /><span className="text-blue-600 text-xs">{uploadProgress || "アップロード中..."}</span></> :
              <><FiUploadCloud size={28} className="text-slate-300" /><span className="text-slate-400 text-xs">クリックまたはドラッグ&ドロップ</span></>}
            </div>
          )}
          <input ref={eyecatchInputRef} type="file" accept="image/*" onChange={handleEyecatchUpload} className="hidden" />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div onDragOver={(e) => { e.preventDefault(); setEditorDragOver(true); }} onDragLeave={() => setEditorDragOver(false)} onDrop={handleEditorDrop} className="relative">
            {editorDragOver && <div className="absolute inset-0 bg-blue-50/80 border-2 border-dashed border-blue-400 rounded-lg z-10 flex items-center justify-center pointer-events-none"><FiUploadCloud size={36} className="text-blue-400" /></div>}
            {mode === "visual" ? (
              <div ref={editorRef} contentEditable onInput={syncFromVisual} onKeyDown={handleEditorKeyDown} className="min-h-[500px] px-6 py-4 prose max-w-none outline-none" style={{ whiteSpace: "pre-wrap" }} />
            ) : (
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="HTMLコードを入力...（&lt;p&gt;ごと改行・&lt;br&gt;で改行）" className="w-full min-h-[500px] px-6 py-4 font-mono text-sm bg-slate-900 text-green-400 outline-none resize-y leading-relaxed whitespace-pre-wrap" spellCheck={false} />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </div>

        {/* リンク挿入ダイアログ */}
        {linkDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setLinkDialogOpen(false)}>
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold text-slate-800 mb-3">テキストリンク</p>
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="URLを入力" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500" />
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">別タブで開く</span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setLinkDialogOpen(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">キャンセル</button>
                <button type="button" onClick={submitLink} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">挿入</button>
              </div>
            </div>
          </div>
        )}

        {/* ボタンリンク挿入ダイアログ */}
        {buttonDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setButtonDialogOpen(false)}>
            <div className="bg-white rounded-lg border border-slate-200 shadow-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold text-slate-800 mb-3">ボタンリンク</p>
              <input type="text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="ボタンテキスト" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500" />
              <input type="url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="リンク先URL" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500" />
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input type="checkbox" checked={buttonNewTab} onChange={(e) => setButtonNewTab(e.target.checked)} className="rounded border-slate-300" />
                <span className="text-sm text-slate-700">別タブで開く</span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setButtonDialogOpen(false)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">キャンセル</button>
                <button type="button" onClick={submitButton} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">挿入</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
