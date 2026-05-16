import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookData, ChapterOutline, PageContent, PageAspectRatio } from './types';
import { Step1Start } from './components/Step1Start';
import { Step2Outline } from './components/Step2Outline';
import { Step3Write } from './components/Step3Write';
import { Step4Design } from './components/Step4Design';
import { Step5Export } from './components/Step5Export';
import { Layout, CheckCircle2, ChevronRight, Save, Clock, BookOpen, PenTool, LayoutTemplate, Download, Key, Settings } from 'lucide-react';
import { cn } from './lib/utils';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'ebookforge_data';
const API_KEY_STORAGE = 'gemini_api_key';

const initialData: BookData = {
  title: '',
  audience: '',
  pages: 60,
  template: 'How-To Guide',
  tone: 'Helpful',
  mode: 'IDEA',
  chapters: [],
  summaries: [],
  imagePrompts: [],
  finalPages: [],
  currentStep: 1,
  lastSaved: Date.now(),
};

export default function App() {
  const [data, setData] = useState<BookData>(initialData);
  const [isResuming, setIsResuming] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [apiKey, setApiKey] = useState(localStorage.getItem(API_KEY_STORAGE) || '');
  const [showSettings, setShowSettings] = useState(false);

  // Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.title) {
        setIsResuming(true);
      }
    }
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem(API_KEY_STORAGE, val);
  };

  // Autosave interval
  useEffect(() => {
    const interval = setInterval(() => {
      saveData();
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  const saveData = (newData?: BookData) => {
    const toSave = newData || data;
    if (!toSave.title) return;
    
    setSaveStatus('saving');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...toSave, lastSaved: Date.now() }));
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleResume = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setData(JSON.parse(saved));
      setIsResuming(false);
    }
  };

  const handleNewBook = () => {
    setData(initialData);
    localStorage.removeItem(STORAGE_KEY);
    setIsResuming(false);
  };

  const nextStep = () => {
    setData(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, 5) }));
    if (data.currentStep === 4) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const prevStep = () => setData(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 1) }));

  const updateData = (updates: Partial<BookData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const steps = [
    { id: 1, name: 'Start', icon: BookOpen },
    { id: 2, name: 'Outline', icon: Layout },
    { id: 3, name: 'Write', icon: PenTool },
    { id: 4, name: 'Design', icon: LayoutTemplate },
    { id: 5, name: 'Export', icon: Download },
  ];

  if (isResuming) {
    return (
      <div className="min-h-screen bg-natural-bg flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-natural-border/30">
          <div className="w-16 h-16 bg-natural-green/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Clock className="text-natural-green w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-natural-text text-center mb-2 tracking-tight">Pick up where you left off?</h1>
          <p className="text-gray-500 text-center mb-8">We found your unfinished book in the forge.</p>
          <div className="space-y-4">
            <button 
              onClick={handleResume}
              className="w-full py-4 bg-natural-green text-white rounded-full font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Resume Studio
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={handleNewBook}
              className="w-full py-4 bg-white text-gray-600 border border-natural-border rounded-full font-bold text-lg hover:bg-gray-50 transition-all"
            >
              Start New Book
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans selection:bg-natural-green/20 selection:text-natural-green">
      {/* Header / Progress */}
      <header className="sticky top-0 z-50 bg-white border-b border-natural-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-natural-green rounded-lg flex items-center justify-center rotate-3">
              < PenTool className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight tracking-tight">EbookForge</h2>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Build Studio v1.2</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl hidden md:flex items-center justify-center gap-2 px-8">
            {steps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div className="relative group">
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-all duration-500",
                    data.currentStep === step.id ? "bg-natural-green scale-150" : 
                    data.currentStep > step.id ? "bg-natural-green" : "bg-natural-border"
                  )} />
                  {data.currentStep === step.id && (
                    <motion.div 
                      layoutId="step-label"
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] uppercase font-black text-natural-green whitespace-nowrap tracking-wider"
                    >
                      Step {step.id}: {step.name}
                    </motion.div>
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "h-[2px] w-12 rounded-full transition-all duration-500",
                    data.currentStep > step.id ? "bg-natural-green" : "bg-natural-border"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  showSettings ? "bg-natural-green text-white" : "text-gray-400 hover:bg-gray-100"
                )}
                title="API Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10, x: -100 }}
                    animate={{ opacity: 1, scale: 1, y: 0, x: -100 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10, x: -100 }}
                    className="absolute top-full mt-2 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-natural-border p-6 z-[100]"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-natural-green/10 rounded-lg flex items-center justify-center">
                        <Key className="text-natural-green w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-sm tracking-tight">Gemini API Configuration</h3>
                    </div>
                    
                    <p className="text-[10px] text-gray-500 mb-4 leading-relaxed">
                      Enter your <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-natural-green underline">Google AI Studio API Key</a> to use your own quota. Key is stored locally in your browser.
                    </p>

                    <input 
                      type="password"
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      placeholder="AIzaSy..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-natural-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-natural-green/20 focus:border-natural-green transition-all"
                    />

                    {apiKey && (
                      <div className="mt-4 p-3 bg-natural-green/5 border border-natural-green/10 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-natural-green" />
                        <span className="text-[9px] font-black text-natural-green uppercase tracking-widest">Custom Key Active</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col items-end hidden sm:flex">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {saveStatus === 'saving' ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Clock className="w-3 h-3" />
                  </motion.div>
                ) : <CheckCircle2 className={cn("w-3 h-3 transition-colors", saveStatus === 'saved' ? "text-green-600" : "text-gray-300")} />}
                {saveStatus === 'saving' ? 'Autosave' : saveStatus === 'saved' ? 'Saved' : 'Forge Active'}
              </div>
              <div className="text-[10px] text-gray-300 font-mono uppercase tracking-tighter">
                {saveStatus === 'saved' ? 'Saved 2s ago' : `Last sync: ${new Date(data.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            </div>
            
            <button 
              onClick={nextStep}
              disabled={data.currentStep === 5}
              className="px-6 py-2.5 bg-natural-green text-white rounded-full font-bold text-sm hover:opacity-90 transition-all shadow-sm flex items-center gap-2 group disabled:opacity-0"
            >
              Next Step
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={data.currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {data.currentStep === 1 && <Step1Start data={data} updateData={updateData} nextStep={nextStep} />}
            {data.currentStep === 2 && <Step2Outline data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} />}
            {data.currentStep === 3 && <Step3Write data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} />}
            {data.currentStep === 4 && <Step4Design data={data} updateData={updateData} nextStep={nextStep} prevStep={prevStep} />}
            {data.currentStep === 5 && <Step5Export data={data} updateData={updateData} prevStep={prevStep} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Tracker */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-2 z-40 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-12 font-mono text-[11px] text-gray-400 font-bold uppercase tracking-widest">
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
             WORD COUNT: <span className="text-gray-900">{data.chapters.reduce((acc, c) => acc + (c?.split(/\s+/).length || 0), 0).toLocaleString()}</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
             PAGE RATIO: <span className="text-gray-900">{Math.round((data.chapters.length / (data.pages / 10)) * 100)}%</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
             LIVE PAGES: <span className="text-gray-900">{data.finalPages.length}</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
