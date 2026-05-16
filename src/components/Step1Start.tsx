import React from 'react';
import { BookData, TEMPLATES, TONES } from '../types';
import { Lightbulb, LayoutList, Target, Layers, ArrowRight, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface StepProps {
  data: BookData;
  updateData: (updates: Partial<BookData>) => void;
  nextStep: () => void;
}

export function Step1Start({ data, updateData, nextStep }: StepProps) {
  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-natural-text mb-4 tracking-tighter italic serif">The Forge awaits your genius.</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">Choose your starting point and let's craft something legendary together.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <button
          onClick={() => updateData({ mode: 'IDEA' })}
          className={cn(
            "group relative p-1 transition-all rounded-[2rem]",
            data.mode === 'IDEA' ? "bg-natural-green scale-105 shadow-2xl shadow-natural-green/10" : "bg-natural-border/30 hover:bg-natural-border/50"
          )}
        >
          <div className="bg-white rounded-[1.9rem] p-8 h-full text-left flex flex-col gap-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", 
              data.mode === 'IDEA' ? "bg-natural-green text-white rotate-6" : "bg-natural-bg text-gray-400 group-hover:rotate-6")}>
              <Lightbulb className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Start from IDEA</h3>
              <p className="text-gray-500 leading-relaxed text-sm">I'll guide you through every word using AI as your master ghostwriter.</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => updateData({ mode: 'CONTENT' })}
          className={cn(
            "group relative p-1 transition-all rounded-[2rem]",
            data.mode === 'CONTENT' ? "bg-natural-green scale-105 shadow-2xl shadow-natural-green/10" : "bg-natural-border/30 hover:bg-natural-border/50"
          )}
        >
          <div className="bg-white rounded-[1.9rem] p-8 h-full text-left flex flex-col gap-6">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", 
              data.mode === 'CONTENT' ? "bg-natural-green text-white -rotate-6" : "bg-natural-bg text-gray-400 group-hover:-rotate-6")}>
              <LayoutList className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Format my CONTENT</h3>
              <p className="text-gray-500 leading-relaxed text-sm">Upload your rough drafts and I'll polish them into a professional studio page.</p>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-natural-border/30">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-8 text-left">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4" /> Book Title
              </label>
              <input 
                type="text"
                placeholder="e.g. The 4-Hour Productivity Secret"
                className="w-full text-2xl font-bold bg-natural-bg/50 border-2 border-transparent focus:border-natural-green focus:bg-white p-4 rounded-2xl outline-none transition-all placeholder:text-gray-300"
                value={data.title}
                onChange={(e) => updateData({ title: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4" /> Desired Audience
              </label>
              <input 
                type="text"
                placeholder="e.g. Overwhelmed solopreneurs"
                className="w-full text-xl font-medium bg-natural-bg/50 border-2 border-transparent focus:border-natural-green focus:bg-white p-4 rounded-2xl outline-none transition-all placeholder:text-gray-300"
                value={data.audience}
                onChange={(e) => updateData({ audience: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-8 border-l border-natural-border pl-10 md:block hidden text-left">
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Target Page Count
                 </label>
                 <span className="text-lg font-bold text-natural-green">{data.pages} Pages</span>
               </div>
               <input 
                type="range" 
                min={20} 
                max={200} 
                step={10}
                className="w-full h-2 bg-natural-accent rounded-full appearance-none cursor-pointer accent-natural-green"
                value={data.pages}
                onChange={(e) => updateData({ pages: parseInt(e.target.value) })}
               />
               <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                 <span>20 PAGES (MINI)</span>
                 <span>200 PAGES (MASTER)</span>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Template</label>
                  <select 
                    className="w-full p-3 bg-natural-bg rounded-xl font-bold text-sm outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-natural-green"
                    value={data.template}
                    onChange={(e) => updateData({ template: e.target.value })}
                  >
                    {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selling Tone</label>
                  <select 
                    className="w-full p-3 bg-natural-bg rounded-xl font-bold text-sm outline-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-natural-green"
                    value={data.tone}
                    onChange={(e) => updateData({ tone: e.target.value })}
                  >
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
             </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <button
            title="Create Book Skeleton"
            disabled={!data.title || !data.audience}
            onClick={nextStep}
            className="group px-12 py-5 bg-natural-green text-white rounded-full font-bold text-xl hover:opacity-90 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-3 shadow-xl shadow-natural-green/20"
          >
            Create Book
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
