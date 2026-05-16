import React, { useState, useEffect } from 'react';
import { BookData, ChapterOutline, BookOutline } from '../types';
import { generateOutline } from '../lib/gemini';
import { motion, Reorder } from 'motion/react';
import { Sparkles, Edit3, GripVertical, AlertCircle, Check, Info, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { createBookSkeleton } from '../lib/SkeletonUtils';

interface StepProps {
  data: BookData;
  updateData: (updates: Partial<BookData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function Step2Outline({ data, updateData, nextStep, prevStep }: StepProps) {
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [localOutline, setLocalOutline] = useState<ChapterOutline[]>(data.outline?.outline || []);

  useEffect(() => {
    if (!data.outline && !loading) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateOutline({
        title: data.title,
        audience: data.audience,
        pages: data.pages,
        template: data.template,
        tone: data.tone,
        guidance: guidance || undefined
      });
      updateData({ outline: result });
      setLocalOutline(result.outline);
      setGuidance("");
    } catch (error) {
      console.error(error);
      alert("Failed to generate outline. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    const finalOutline = { ...data.outline!, outline: localOutline };
    const skeleton = createBookSkeleton({ ...data, outline: finalOutline });
    updateData({ outline: finalOutline, finalPages: skeleton });
    nextStep();
  };

  const updateChapter = (id: string, updates: Partial<ChapterOutline>) => {
    setLocalOutline(prev => prev.map(ch => ch.id === id ? { ...ch, ...updates } : ch));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 bg-natural-green/10 rounded-3xl flex items-center justify-center"
        >
          <Sparkles className="text-natural-green w-10 h-10" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 serif italic">Gemini is forging your outline...</h2>
          <p className="text-gray-400">Analyzing your audience and crafting the perfect transformation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button onClick={prevStep} className="p-3 hover:bg-natural-accent rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold tracking-tighter serif italic">The Blueprint</h1>
            <p className="text-gray-400 font-medium">Drag to reorder, click to edit. Refine your journey.</p>
          </div>
        </div>

        <button 
          onClick={() => setShowHelp(!showHelp)}
          className={cn("px-6 py-3 rounded-full flex items-center gap-2 font-bold transition-all", 
            showHelp ? "bg-natural-green text-white shadow-lg" : "bg-white border border-natural-border text-gray-500 hover:border-natural-green/30")}
        >
          <Info className="w-5 h-5" />
          Success Tips
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-12 items-start">
        <div className="space-y-4">
          <Reorder.Group axis="y" values={localOutline} onReorder={setLocalOutline} className="space-y-4">
            {localOutline.map((chapter, idx) => (
              <Reorder.Item 
                key={chapter.id} 
                value={chapter}
                className="bg-white border border-natural-border/30 rounded-[1.5rem] p-6 shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-start gap-4">
                  <div className="pt-2 text-natural-border">
                    <GripVertical className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-natural-green/40 uppercase tracking-[0.2em]">Chapter {idx + 1}</span>
                      <Edit3 className="w-4 h-4 text-gray-200 group-hover:text-natural-green transition-colors" />
                    </div>
                    <input 
                      className="text-xl font-bold bg-transparent border-none outline-none w-full focus:text-natural-green transition-colors serif italic"
                      value={chapter.title}
                      onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-6 pt-2 border-t border-natural-bg">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Problem</span>
                        <textarea 
                          className="w-full text-xs font-medium text-gray-500 bg-transparent resize-none border-none outline-none focus:text-natural-text" 
                          rows={2}
                          value={chapter.problem}
                          onChange={(e) => updateChapter(chapter.id, { problem: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Outcome</span>
                        <textarea 
                          className="w-full text-xs font-medium text-gray-500 bg-transparent resize-none border-none outline-none focus:text-natural-text" 
                          rows={2}
                          value={chapter.outcome}
                          onChange={(e) => updateChapter(chapter.id, { outcome: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          
          <div className="bg-white border border-natural-border/30 rounded-[1.5rem] p-6 space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Regeneration Guidance (Optional)</label>
                <textarea 
                  placeholder="e.g. Make it more focused on technical SEO, or add a chapter about AI integration..."
                  className="w-full bg-natural-bg/50 border border-natural-border/20 rounded-xl p-4 text-sm outline-none focus:border-natural-green transition-all min-h-[80px] resize-none"
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                />
             </div>
             <button 
              onClick={handleGenerate}
              className="w-full py-4 bg-natural-accent text-natural-text font-bold rounded-xl hover:bg-natural-green hover:text-white transition-all flex items-center justify-center gap-2"
             >
                <Sparkles className="w-5 h-5" />
                {guidance ? "Regenerate with Guidance" : "Regenerate Entire Outline"}
             </button>
          </div>
        </div>

        <aside className="space-y-6 sticky top-24">
           {showHelp && (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-natural-text text-white rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-natural-green/20 blur-3xl rounded-full -mr-16 -mt-16" />
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 serif italic">Success Checklist</h3>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-natural-green uppercase tracking-widest flex items-center gap-2">
                       <Check className="w-3 h-3" /> DO THESE
                    </span>
                    <ul className="text-sm space-y-2 text-gray-400 font-medium leading-relaxed">
                      <li>• Focus on ONE specific outcome</li>
                      <li>• Name your unique mechanism</li>
                      <li>• Use real numbers and proof</li>
                      <li>• End every chapter with action</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest flex items-center gap-2">
                       <AlertCircle className="w-3 h-3" /> AVOID THESE
                    </span>
                    <ul className="text-sm space-y-2 text-gray-400 font-medium leading-relaxed">
                      <li>• Using generic fluff tips</li>
                      <li>• Being too technical</li>
                      <li>• Selling before giving value</li>
                      <li>• Lack of specific examples</li>
                    </ul>
                  </div>
                </div>
             </motion.div>
           )}

           <div className="bg-white rounded-[2rem] p-8 border border-natural-border/50 space-y-4">
              <h4 className="font-bold text-natural-text text-xs uppercase tracking-widest opacity-50">Transformation</h4>
              <p className="text-sm text-natural-text leading-relaxed italic serif">"{data.outline?.transformation}"</p>
           </div>

           <button
             onClick={handleApprove}
             className="w-full py-5 bg-natural-green text-white rounded-full font-bold text-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
           >
             Approve Outline
             <ArrowRight className="w-6 h-6" />
           </button>
        </aside>
      </div>
    </div>
  );
}
