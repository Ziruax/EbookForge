import React, { useState, useEffect, useRef } from 'react';
import { BookData, PageContent, PageAspectRatio, BookImage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Undo, Redo, Plus, Trash2, Palette, Moon, Sun, 
  Image as ImageIcon, Upload, Copy, Check, 
  ArrowLeft, ArrowRight, Type, Maximize, Save,
  X, HelpCircle, Monitor, Smartphone, Layout, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateImagePrompt } from '../lib/gemini';

interface StepProps {
  data: BookData;
  updateData: (updates: Partial<BookData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function Step4Design({ data, updateData, nextStep, prevStep }: StepProps) {
  const [history, setHistory] = useState<PageContent[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeImagePanel, setActiveImagePanel] = useState<{ pageId: string, imgId: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isForgingPrompt, setIsForgingPrompt] = useState<string | null>(null);
  const pageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const forgePrompt = async (pageId: string, imgId: string) => {
    const page = data.finalPages.find(p => p.id === pageId);
    if (!page) return;
    
    setIsForgingPrompt(imgId);
    try {
      const { prompt } = await generateImagePrompt({
        title: data.title,
        pageTitle: page.title,
        content: page.content
      });
      
      const newPages = data.finalPages.map(p => {
        if (p.id === pageId) {
          return {
            ...p,
            images: p.images.map(img => img.id === imgId ? { ...img, prompt } : img)
          };
        }
        return p;
      });
      pushHistory(newPages);
    } catch (error) {
      console.error(error);
      alert("Failed to forge prompt.");
    } finally {
      setIsForgingPrompt(null);
    }
  };

  // Initialize history
  useEffect(() => {
    if (historyIndex === -1 && data.finalPages.length > 0) {
      setHistory([data.finalPages]);
      setHistoryIndex(0);
    }
  }, []);

  const pushHistory = (newPages: PageContent[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPages);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    updateData({ finalPages: newPages });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      updateData({ finalPages: history[newIdx] });
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      updateData({ finalPages: history[newIdx] });
    }
  };

  const updatePage = (id: string, updates: Partial<PageContent>) => {
    const newPages = data.finalPages.map(p => p.id === id ? { ...p, ...updates } : p);
    pushHistory(newPages);
  };

  const addPage = () => {
    const newPage: PageContent = {
      id: `custom_page_${Date.now()}`,
      type: 'chapter',
      title: 'New Page',
      content: 'Start writing here...',
      wordCount: 0,
      images: []
    };
    pushHistory([...data.finalPages, newPage]);
  };

  const deletePage = (id: string) => {
    if (confirm("Are you sure you want to delete this page?")) {
      pushHistory(data.finalPages.filter(p => p.id !== id));
    }
  };

  const handleImageUpload = (pageId: string, imgId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newPages = data.finalPages.map(p => {
          if (p.id === pageId) {
            return {
              ...p,
              images: p.images.map(img => img.id === imgId ? { ...img, url } : img)
            };
          }
          return p;
        });
        pushHistory(newPages);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (pageId: string, imgId: string) => {
    const newPages = data.finalPages.map(p => {
      if (p.id === pageId) {
        return {
          ...p,
          images: p.images.map(img => img.id === imgId ? { ...img, url: undefined } : img)
        };
      }
      return p;
    });
    pushHistory(newPages);
  };

  const copyPrompt = (prompt: string, id: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'page'>('page');
  const [activePageIndex, setActivePageIndex] = useState(0);

  const scrollToPage = (id: string) => {
    setSelectedPageId(id);
    const index = data.finalPages.findIndex(p => p.id === id);
    if (index !== -1) setActivePageIndex(index);
    if (viewMode === 'grid') {
      pageRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const nextPage = () => setActivePageIndex(prev => Math.min(data.finalPages.length - 1, prev + 1));
  const prevPage = () => setActivePageIndex(prev => Math.max(0, prev - 1));

  // Sync selected page ID when active index changes in page mode
  useEffect(() => {
    if (viewMode === 'page' && data.finalPages[activePageIndex]) {
      setSelectedPageId(data.finalPages[activePageIndex].id);
    }
  }, [activePageIndex, viewMode]);

  return (
    <div className={cn(
      "min-h-[calc(100vh-72px)] transition-colors duration-500 font-sans flex flex-col",
      isDarkMode ? "bg-natural-text text-stone-100" : "bg-natural-bg text-natural-text"
    )}>
      {/* Editor Toolbar */}
      <div className={cn(
        "sticky top-0 z-40 border-b px-6 py-3 flex items-center justify-between backdrop-blur-md shrink-0",
        isDarkMode ? "bg-natural-text/80 border-stone-800" : "bg-white/80 border-natural-border"
      )}>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={historyIndex <= 0} className="w-10 h-10 flex items-center justify-center hover:bg-natural-accent rounded-full disabled:opacity-30 transition-all">
            <Undo className="w-5 h-5 text-gray-400" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="w-10 h-10 flex items-center justify-center hover:bg-natural-accent rounded-full disabled:opacity-30 transition-all">
            <Redo className="w-5 h-5 text-gray-400" />
          </button>
          <div className="w-[1px] h-6 bg-natural-border mx-2" />
          
          <div className="flex bg-natural-accent/50 p-1 rounded-xl">
             <button 
              onClick={() => setViewMode('page')}
              className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'page' ? "bg-white shadow-sm text-natural-green" : "text-gray-400")}
             >
               Page
             </button>
             <button 
              onClick={() => setViewMode('grid')}
              className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-natural-green" : "text-gray-400")}
             >
               Scroll
             </button>
          </div>

          <button onClick={addPage} className="px-4 py-2 flex items-center gap-2 hover:bg-natural-accent rounded-full font-bold text-[10px] uppercase tracking-widest transition-all text-gray-500">
            <Plus className="w-4 h-4" /> Add Page
          </button>
        </div>

        <div className="flex items-center gap-4">
           {viewMode === 'page' && (
             <div className="flex items-center gap-2 bg-natural-accent/30 px-3 py-1.5 rounded-full mr-4">
                <button onClick={prevPage} disabled={activePageIndex === 0} className="disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-[10px] font-black font-mono w-12 text-center">{activePageIndex + 1} / {data.finalPages.length}</span>
                <button onClick={nextPage} disabled={activePageIndex === data.finalPages.length - 1} className="disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
             </div>
           )}
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-10 h-10 flex items-center justify-center hover:bg-natural-accent rounded-full transition-all">
             {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-400" />}
           </button>
           <button onClick={nextStep} className="bg-natural-green text-white px-8 py-2 rounded-full font-bold hover:opacity-90 shadow-xl shadow-natural-green/10 flex items-center gap-2 transition-all">
             Finish Design <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Book Structure Sidebar */}
        <aside className={cn(
          "w-72 border-r overflow-y-auto hidden lg:block transition-colors shrink-0",
          isDarkMode ? "bg-natural-text border-stone-800" : "bg-white/50 border-natural-border/30"
        )}>
          <div className="p-6 space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Book Structure</h3>
              <div className="space-y-1">
                {data.finalPages.map((page, idx) => (
                  <button
                    key={page.id}
                    onClick={() => scrollToPage(page.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 group",
                      selectedPageId === page.id 
                        ? (isDarkMode ? "bg-stone-800 text-white" : "bg-natural-accent text-natural-text")
                        : "hover:bg-natural-accent/50 text-gray-500"
                    )}
                  >
                    <span className="w-5 h-5 flex items-center justify-center bg-natural-bg rounded-md text-[10px] font-bold group-hover:bg-natural-green group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="truncate">{page.title || "Untitled Page"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto page-scroller scroll-smooth relative bg-natural-accent/10">
          <div className={cn(
            "max-w-4xl mx-auto py-12 px-6 h-full",
            viewMode === 'page' ? "flex items-center justify-center p-0" : ""
          )}>
            {viewMode === 'grid' ? (
              <div className="space-y-24 pb-48 w-full">
                {data.finalPages.map((page, idx) => (
                  <motion.div 
                    key={page.id}
                    ref={el => { pageRefs.current[page.id] = el; }}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    onClick={() => setSelectedPageId(page.id)}
                    className={cn(
                      "group relative bg-white canvas-shadow rounded-sm aspect-[1/1.41] p-16 flex flex-col transition-all overflow-hidden mx-auto",
                      isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-natural-border/30",
                      selectedPageId === page.id ? "ring-2 ring-natural-green/20" : ""
                    )}
                  >
                    <PageRenderer page={page} idx={idx} isDarkMode={isDarkMode} updatePage={updatePage} deletePage={deletePage} setActiveImagePanel={setActiveImagePanel} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activePageIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "relative bg-white canvas-shadow rounded-sm aspect-[1/1.41] p-16 flex flex-col transition-all overflow-hidden w-full max-w-2xl",
                    isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-natural-border/30"
                  )}
                >
                  <PageRenderer 
                    page={data.finalPages[activePageIndex]} 
                    idx={activePageIndex} 
                    isDarkMode={isDarkMode} 
                    updatePage={updatePage} 
                    deletePage={deletePage} 
                    setActiveImagePanel={setActiveImagePanel} 
                  />
                  
                  {/* Page Navigation Overlay */}
                  <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                     <button onClick={prevPage} disabled={activePageIndex === 0} className="p-4 bg-white/80 rounded-full shadow-lg text-natural-text disabled:opacity-0">
                        <ChevronLeft className="w-8 h-8" />
                     </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                     <button onClick={nextPage} disabled={activePageIndex === data.finalPages.length - 1} className="p-4 bg-white/80 rounded-full shadow-lg text-natural-text disabled:opacity-0">
                        <ChevronRight className="w-8 h-8" />
                     </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Image Panel Overlay */}
      <AnimatePresence>
        {activeImagePanel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
               onClick={() => setActiveImagePanel(null)}
             />
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-10 overflow-hidden"
             >
                <button onClick={() => setActiveImagePanel(null)} className="absolute top-6 right-6 p-2 hover:bg-stone-50 rounded-full">
                  <X className="w-6 h-6 text-stone-400" />
                </button>

                <h3 className="text-2xl font-bold mb-2">Configure Visual</h3>
                <p className="text-sm text-stone-400 mb-8 font-medium">Use AI to generate or upload your own studio-grade asset.</p>

                 <div className="space-y-8">
                   <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Master Prompt</span>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-stone-200 rounded-md text-stone-500 uppercase">
                              {data.finalPages.find(p => p.id === activeImagePanel.pageId)?.images.find(i => i.id === activeImagePanel.imgId)?.aspect}
                            </span>
                         </div>
                      </div>
                      <div className="text-sm font-medium text-stone-700 leading-relaxed max-h-40 overflow-y-auto">
                        "{data.finalPages.find(p => p.id === activeImagePanel.pageId)?.images.find(i => i.id === activeImagePanel.imgId)?.prompt}"
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyPrompt(data.finalPages.find(p => p.id === activeImagePanel.pageId)?.images.find(i => i.id === activeImagePanel.imgId)?.prompt || "", 'p_modal')}
                          className={cn(
                            "flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                            copiedId === 'p_modal' ? "bg-green-100 text-green-600" : "bg-white text-stone-900 border border-stone-200 hover:bg-stone-900 hover:text-white"
                          )}
                        >
                          {copiedId === 'p_modal' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedId === 'p_modal' ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          onClick={() => forgePrompt(activeImagePanel.pageId, activeImagePanel.imgId)}
                          disabled={isForgingPrompt === activeImagePanel.imgId}
                          className="flex-1 py-4 bg-natural-green text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          {isForgingPrompt === activeImagePanel.imgId ? <Layout className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Forge Prompt
                        </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <label className="relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-stone-200 rounded-3xl hover:border-orange-500 hover:bg-orange-50 cursor-pointer transition-all group">
                         <Upload className="w-8 h-8 text-stone-400 group-hover:text-orange-600" />
                         <span className="text-xs font-bold text-stone-500 group-hover:text-orange-900">Upload Image</span>
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                           handleImageUpload(activeImagePanel.pageId, activeImagePanel.imgId, e);
                           setActiveImagePanel(null);
                         }} />
                      </label>
                      <button 
                        onClick={() => {
                          removeImage(activeImagePanel.pageId, activeImagePanel.imgId);
                          setActiveImagePanel(null);
                        }}
                        className="flex flex-col items-center justify-center gap-3 p-8 border border-stone-100 rounded-3xl hover:bg-red-50 text-stone-400 hover:text-red-600 transition-all group"
                      >
                         <Trash2 className="w-8 h-8" />
                         <span className="text-xs font-bold font-medium">Remove Current</span>
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PageRenderer({ page, idx, isDarkMode, updatePage, deletePage, setActiveImagePanel }: any) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  if (!page) return null;
  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Page Number */}
      <div className="absolute top-0 right-0 font-mono text-[10px] text-gray-300 font-bold uppercase tracking-[0.3em]">
        PAGE {idx + 1}
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-0 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} 
          className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {page.type === 'cover' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
           <textarea
            className={cn(
              "text-6xl font-bold tracking-tighter leading-none bg-transparent text-center resize-none w-full border-none outline-none focus:text-natural-green serif italic transition-colors",
              isDarkMode ? "text-stone-100" : "text-stone-900"
            )}
            rows={3}
            value={page.title}
            onChange={(e) => updatePage(page.id, { title: e.target.value })}
          />
          <textarea
            className="text-sm text-gray-400 font-medium tracking-widest uppercase bg-transparent text-center resize-none w-full border-none outline-none"
            rows={2}
            value={page.subtitle}
            onChange={(e) => updatePage(page.id, { subtitle: e.target.value })}
          />
           {page.images.map((img: any) => (
            <div key={img.id} className="w-full mt-12">
              <ImageBlock 
                img={img} 
                pageId={page.id} 
                onOpen={() => setActiveImagePanel({ pageId: page.id, imgId: img.id })} 
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-8 h-full">
          {isEditingTitle ? (
            <textarea
              autoFocus
              onBlur={() => setIsEditingTitle(false)}
              className={cn(
                "text-4xl font-bold tracking-tight bg-transparent resize-none w-full border-none outline-none focus:text-natural-green serif italic transition-colors",
                isDarkMode ? "text-stone-100" : "text-stone-900"
              )}
              rows={2}
              value={page.title}
              onChange={(e) => updatePage(page.id, { title: e.target.value })}
            />
          ) : (
            <h1 
              onClick={() => setIsEditingTitle(true)}
              className={cn(
                "text-4xl font-bold tracking-tight serif italic cursor-text hover:text-natural-green transition-colors",
                isDarkMode ? "text-stone-100" : "text-stone-900"
              )}
            >
              {page.title}
            </h1>
          )}
          
          {page.images.length > 0 && (
            <div className="w-full">
              <ImageBlock 
                img={page.images[0]} 
                pageId={page.id} 
                onOpen={() => setActiveImagePanel({ pageId: page.id, imgId: page.images[0].id })} 
              />
            </div>
          )}

          <div className="flex-1 overflow-visible">
            {isEditingContent ? (
              <textarea
                autoFocus
                onBlur={() => setIsEditingContent(false)}
                className={cn(
                  "w-full h-full text-lg leading-relaxed bg-transparent resize-none border-none outline-none focus:bg-natural-bg/30 rounded-xl p-2 serif transition-all",
                  isDarkMode ? "text-stone-300" : "text-natural-text/80"
                )}
                value={page.content}
                onChange={(e) => updatePage(page.id, { content: e.target.value })}
              />
            ) : (
              <div 
                onClick={() => setIsEditingContent(true)}
                className={cn(
                  "w-full h-full text-lg leading-relaxed cursor-text prose prose-stone max-w-none prose-headings:serif prose-headings:italic",
                  isDarkMode ? "prose-invert text-stone-300" : "text-natural-text/80",
                  page.type === 'toc' ? "font-mono text-sm leading-loose" : "serif"
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{page.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageBlock({ img, pageId, onOpen }: { img: BookImage, pageId: string, onOpen: () => void }) {
  const aspectClasses = {
    '16:9': 'aspect-video',
    '1:1': 'aspect-square',
    '9:16': 'aspect-[9/16]'
  };

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className={cn(
        "relative w-full rounded-2xl overflow-hidden cursor-pointer group bg-stone-100 border-2 border-dashed border-stone-200 transition-all hover:border-orange-500",
        aspectClasses[img.aspect] || 'aspect-video'
      )}
    >
      {img.url ? (
        <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
           <ImageIcon className="w-12 h-12 text-stone-300 group-hover:text-orange-500 transition-colors" />
           <p className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{img.aspect} MASTER ASSET</p>
        </div>
      )}
      <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
         <span className="bg-white text-stone-900 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl ring-4 ring-white/20">Edit Asset</span>
      </div>
    </div>
  );
}
