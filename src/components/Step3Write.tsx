import React, { useState, useEffect } from 'react';
import { BookData, ChapterOutline } from '../types';
import { generateChapter } from '../lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, PenTool, CheckCircle2, ChevronRight, ChevronLeft, ArrowLeft, ArrowRight, Loader2, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StepProps {
  data: BookData;
  updateData: (updates: Partial<BookData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function Step3Write({ data, updateData, nextStep, prevStep }: StepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [isAutoWriting, setIsAutoWriting] = useState(false);
  const chapters = data.outline?.outline || [];
  
  const currentChapter = chapters[currentIndex];
  const isLastChapter = currentIndex === chapters.length - 1;
  const isFirstChapter = currentIndex === 0;

  const currentContent = data.chapters[currentIndex];
  const wordCount = currentContent?.split(/\s+/).length || 0;
  
  // Calculate dynamic word target: (pages - 10) * 250 / chapters
  const targetWords = data.outline ? Math.floor((data.pages - 10) * 250 / data.outline.outline.length) : 900;

  const handleGenerate = async () => {
    if (!currentChapter) return;
    setGenerating(true);
    try {
      const result = await generateServerChapter(currentIndex, data.chapters, data.summaries);
      
      const newChapters = [...data.chapters];
      newChapters[currentIndex] = result.content;
      
      const newSummaries = [...data.summaries];
      newSummaries[currentIndex] = result.summary;

      const newPrompts = [...(data.imagePrompts || [])];
      newPrompts[currentIndex] = result.imagePrompt || "";

      updateData({ chapters: newChapters, summaries: newSummaries, imagePrompts: newPrompts });
    } catch (error) {
      console.error(error);
      alert("Failed to generate chapter. Please check your connection.");
    } finally {
      setGenerating(false);
    }
  };

  const generateServerChapter = async (index: number, currentChapters: string[], currentSummaries: string[]) => {
    const ch = chapters[index];
    return await generateChapter({
      chapterIndex: index,
      totalChapters: chapters.length,
      chapterTitle: ch.title,
      mechanism: ch.mechanism,
      outline: chapters,
      previousSummary: index > 0 ? (currentSummaries[index - 1] || "") : "",
      isIdeaMode: data.mode === 'IDEA',
      title: data.title,
      audience: data.audience,
      totalPages: data.pages
    });
  };

  const handleAutoWrite = async () => {
    if (isAutoWriting) return;
    setIsAutoWriting(true);
    let tempChapters = [...data.chapters];
    let tempSummaries = [...data.summaries];
    let tempPrompts = [...(data.imagePrompts || [])];
    
    try {
      for (let i = currentIndex; i < chapters.length; i++) {
        if (tempChapters[i]) continue;
        
        setCurrentIndex(i);
        const result = await generateServerChapter(i, tempChapters, tempSummaries);
        
        tempChapters[i] = result.content;
        tempSummaries[i] = result.summary;
        tempPrompts[i] = result.imagePrompt || "";
        
        updateData({ 
          chapters: [...tempChapters], 
          summaries: [...tempSummaries],
          imagePrompts: [...tempPrompts]
        });
      }
    } catch (error) {
       console.error(error);
       alert("Auto-write interrupted. You can continue manually.");
    } finally {
       setIsAutoWriting(false);
    }
  };

  const handleFinishWriting = () => {
    // 1. First, process all chapters to determine how many pages each one takes
    // We split by ## headings primarily for cleaner page breaks
    const processedChapters = chapters.map((ch, i) => {
      const rawContent = data.chapters[i] || "";
      // Split by ## headings
      const sections = rawContent.split(/(?=##\s)/).filter(s => s.trim());
      return {
        ...ch,
        sections
      };
    });

    // 2. Initialize pagination
    let currentPageNum = 5; // Start after Cover (1), Copyright (2), TOC (3), Intro (4)
    const tocEntries: string[] = [];
    const finalPageObjects: any[] = [];

    processedChapters.forEach((ch, i) => {
      const startPage = currentPageNum;
      const chapterNum = (i + 1).toString().padStart(2, '0');
      
      ch.sections.forEach((section, sIdx) => {
        finalPageObjects.push({
          id: `ch_${i}_p_${sIdx}`,
          type: 'chapter',
          chapterIndex: i,
          title: sIdx === 0 ? ch.title : `${ch.title} (Cont.)`,
          content: section,
          wordCount: section.split(/\s+/).length,
          images: sIdx === 0 ? [{ id: `img_${i}`, aspect: '16:9', prompt: data.imagePrompts[i] || "" }] : []
        });
        currentPageNum++;
      });

      tocEntries.push(`| ${chapterNum} | ${ch.title} | PAGE ${startPage} |`);
    });

    const tocHeader = "| # | CHAPTER TITLE | LOCATION |\n|---|:---|---:|\n";
    const tocContent = `## Guide Contents\n\n${tocHeader}${tocEntries.join('\n')}\n\n*Note: Precision typography applied via Forge V3*`;
    
    // Create resources content
    const resourcesContent = `## Strategic Resources\n\nListed below are the core frameworks and unique mechanisms introduced in this volume for your immediate application:\n\n` + 
      chapters.map(ch => `* **${ch.mechanism}**: ${ch.outcome}`).join('\n') + 
      `\n\n### Supplemental Tools\n* Implementation Checklist V1.2\n* Strategic Outcome Planner\n* The ${data.title} Knowledge Graph`;

    // 3. Assemble finalPages
    const finalPages: any[] = [];
    
    // Find template pages
    const coverPage = data.finalPages.find(p => p.type === 'cover');
    const copyrightPage = data.finalPages.find(p => p.type === 'copyright');
    const tocPagePlaceholder = data.finalPages.find(p => p.type === 'toc');
    const introPage = data.finalPages.find(p => p.type === 'intro');
    const authorPage = data.finalPages.find(p => p.type === 'author');
    const resourcesPagePlaceholder = data.finalPages.find(p => p.type === 'resources');
    const ctaPage = data.finalPages.find(p => p.type === 'cta');

    if (coverPage) finalPages.push(coverPage);
    if (copyrightPage) finalPages.push(copyrightPage);
    if (tocPagePlaceholder) finalPages.push({ ...tocPagePlaceholder, content: tocContent });
    if (introPage) finalPages.push(introPage);
    
    // Add all chapter pages
    finalPageObjects.forEach(p => finalPages.push(p));

    // Add back pages
    if (authorPage) finalPages.push(authorPage);
    if (resourcesPagePlaceholder) finalPages.push({ ...resourcesPagePlaceholder, content: resourcesContent });
    if (ctaPage) finalPages.push(ctaPage);

    updateData({ finalPages });
    nextStep();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 text-left">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={prevStep} className="p-3 hover:bg-natural-accent rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="text-left">
            <h1 className="text-4xl font-bold tracking-tighter serif italic">Writing Forge</h1>
            <p className="text-gray-400 font-medium font-mono text-[10px] uppercase tracking-widest mt-1">
              Chapter {currentIndex + 1} of {chapters.length} • {Math.round((data.chapters.filter(Boolean).length / chapters.length) * 100)}% Complete
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
           onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
           disabled={isFirstChapter}
           className="p-4 rounded-full border border-natural-border hover:bg-natural-accent disabled:opacity-30 disabled:grayscale transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="bg-white border border-natural-border px-6 py-4 rounded-2xl font-bold font-mono text-sm tracking-tighter w-32 text-center">
            {currentIndex + 1} / {chapters.length}
          </div>
          <button 
           onClick={() => setCurrentIndex(Math.min(chapters.length - 1, currentIndex + 1))}
           disabled={isLastChapter || !currentContent}
           className="p-4 rounded-full border border-natural-border hover:bg-natural-accent disabled:opacity-30 disabled:grayscale transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-12 items-start">
        <div className="space-y-8">
          <AnimatePresence mode="wait">
            <motion.div 
               key={currentIndex}
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               className="bg-white border border-natural-border/30 rounded-[2.5rem] p-12 shadow-sm min-h-[600px] relative text-left"
            >
               {!currentContent && !generating && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-20 h-20 bg-natural-green/10 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                      <PenTool className="text-natural-green w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 serif italic">Ready to forge this chapter?</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-10 text-lg leading-relaxed">
                      I'll use your outline and context to write a high-conversion tutorial.
                    </p>
                    <button 
                      onClick={handleGenerate}
                      className="px-10 py-5 bg-natural-green text-white rounded-full font-bold text-xl hover:opacity-90 shadow-xl shadow-natural-green/10 flex items-center gap-3 active:scale-95 transition-all"
                    >
                      <Sparkles className="w-6 h-6" />
                      Generate Chapter {currentIndex + 1}
                    </button>
                 </div>
               )}

               {(generating || isAutoWriting) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-white/90 backdrop-blur-sm z-10 rounded-[2.5rem]">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="w-24 h-24 border-4 border-natural-accent border-t-natural-green rounded-full mb-8"
                    />
                    <h3 className="text-3xl font-black mb-2 italic serif">
                      {isAutoWriting ? "Auto-Writing Series..." : "Gemini is Ghostwriting..."}
                    </h3>
                    <p className="text-gray-400 font-mono text-[10px] uppercase tracking-[0.3em]">
                      {isAutoWriting ? `Current: ${chapters[currentIndex]?.title}` : `Teaching the "${currentChapter?.mechanism}"`}
                    </p>
                    <div className="mt-12 space-y-4 w-full max-w-xs">
                       {[0, 1, 2].map(i => (
                         <div key={i} className="h-2 bg-natural-accent rounded-full overflow-hidden">
                           <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            className="w-full h-full bg-natural-green/30"
                           />
                         </div>
                       ))}
                    </div>
                    {isAutoWriting && (
                      <button 
                        onClick={() => setIsAutoWriting(false)}
                        className="mt-8 text-red-500 font-bold text-xs uppercase tracking-widest hover:underline"
                      >
                        Stop Auto-Write
                      </button>
                    )}
                 </div>
               )}

               {currentContent && !generating && !isAutoWriting && (
                 <div className="prose prose-stone max-w-none prose-p:text-natural-text/90 prose-p:font-serif prose-headings:font-serif prose-headings:italic prose-p:leading-relaxed text-left">
                    <div className="flex items-center gap-3 mb-8">
                      <span className="bg-natural-green text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Master Draft</span>
                      <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest">{wordCount} / {targetWords} Words Generated</span>
                    </div>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentContent}</ReactMarkdown>
                    
                    <div className="mt-12 pt-8 border-t border-natural-accent flex justify-between items-center">
                       <button 
                        onClick={handleGenerate}
                        className="text-natural-green font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-natural-green/5 px-4 py-2 rounded-full transition-colors"
                       >
                         <Sparkles className="w-4 h-4" />
                         Rewrite Chapter
                       </button>
                       <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest">
                         <CheckCircle2 className="w-4 h-4" />
                         Saved to Forge
                       </div>
                    </div>
                 </div>
               )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="space-y-6 sticky top-24 text-left">
           {/* Navigation Progress Sidebar */}
           <div className="bg-white border border-natural-border/50 text-natural-text rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-natural-bg rounded-2xl flex items-center justify-center">
                       <BookOpen className="text-natural-green w-6 h-6" />
                    </div>
                    <div className="text-left">
                       <h3 className="font-bold text-sm uppercase tracking-wider">Progress</h3>
                       <p className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest">Mastering Continuity</p>
                    </div>
                 </div>
                 {data.chapters.filter(Boolean).length < chapters.length && (
                    <button 
                      onClick={handleAutoWrite}
                      disabled={generating || isAutoWriting}
                      className="p-3 bg-natural-green/10 text-natural-green rounded-full hover:bg-natural-green hover:text-white transition-all disabled:opacity-50"
                      title="Auto-write remaining chapters"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                 )}
              </div>

              <div className="space-y-2">
                 {chapters.map((ch, idx) => (
                   <button 
                     key={ch.id}
                     onClick={() => setCurrentIndex(idx)}
                     disabled={idx > 0 && !data.chapters[idx-1]}
                     className={cn(
                       "w-full p-4 rounded-[1.2rem] text-left border flex items-center justify-between transition-all group",
                       currentIndex === idx ? "bg-natural-green border-natural-green text-white" : 
                       data.chapters[idx] ? "bg-natural-accent border-natural-border/30 text-natural-text/70" : "bg-transparent border-natural-border/20 text-gray-300 opacity-50 grayscale cursor-not-allowed"
                     )}
                   >
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black opacity-30 italic">{idx + 1}</span>
                        <span className="text-xs font-bold truncate max-w-[120px]">{ch.title}</span>
                     </div>
                     {data.chapters[idx] && <CheckCircle2 className="w-4 h-4 text-white/50 group-hover:scale-110 transition-transform" />}
                   </button>
                 ))}
              </div>

              {currentIndex > 0 && !data.chapters[currentIndex-1] && (
                <div className="mt-8 p-4 bg-orange-600/5 rounded-2xl border border-orange-200/20 flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 w-5 h-5 shrink-0" />
                  <p className="text-[10px] text-orange-800 font-medium leading-relaxed">
                    Finish previous chapters first to maintain continuity and transformation flow.
                  </p>
                </div>
              )}
           </div>

           <button
             disabled={data.chapters.filter(Boolean).length < chapters.length}
             onClick={handleFinishWriting}
             className={cn(
                "w-full py-6 rounded-full font-black text-xl flex items-center justify-center gap-3 transition-all",
                data.chapters.filter(Boolean).length === chapters.length ? 
                "bg-natural-green text-white shadow-xl shadow-natural-green/10 hover:scale-[1.02] active:scale-[0.98]" : 
                "bg-natural-accent text-gray-300 border border-natural-border cursor-not-allowed"
             )}
           >
             Go to Designer
             < ChevronRight className="w-6 h-6" />
           </button>
        </aside>
      </div>
    </div>
  );
}
