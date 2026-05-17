export interface ChapterOutline {
  id: string;
  title: string;
  problem: string;
  mechanism: string;
  outcome: string;
  keyInsight?: string;
}

export interface BookOutline {
  transformation: string;
  outline: ChapterOutline[];
}

export type PageAspectRatio = '16:9' | '1:1' | '9:16';

export interface BookImage {
  id: string;
  aspect: PageAspectRatio;
  url?: string;
  prompt: string;
}

export interface PageContent {
  id: string;
  type: 'cover' | 'copyright' | 'toc' | 'intro' | 'chapter' | 'conclusion' | 'author' | 'resources' | 'cta';
  title: string;
  subtitle?: string;
  content: string;
  chapterIndex?: number;
  wordCount: number;
  images: BookImage[];
}

export interface BookSettings {
  headingFont: string;
  bodyFont: string;
}

export interface BookData {
  title: string;
  audience: string;
  pages: number;
  template: string;
  tone: string;
  mode: 'IDEA' | 'CONTENT';
  outline?: BookOutline;
  chapters: string[]; // Raw content
  summaries: string[]; // Context summaries
  imagePrompts: string[]; // Generated prompts
  finalPages: PageContent[];
  currentStep: number;
  lastSaved: number;
  settings?: BookSettings;
  llmSettings?: {
    provider: 'gemini' | 'openrouter' | 'groq' | 'nvidia';
    geminiKey?: string;
    geminiModel?: string;
    openrouterKey?: string;
    openrouterModel?: string;
    groqKey?: string;
    groqModel?: string;
    nvidiaKey?: string;
    nvidiaModel?: string;
  };
}

export const TEMPLATES = ['How-To Guide', 'Lead Magnet', 'Authority Book'];
export const TONES = ['Helpful', 'Direct Response'];
