import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const getGenAI = (req: express.Request) => {
  const customKey = req.headers['x-gemini-key'] as string;
  if (customKey && customKey.trim().length > 0) {
    return new GoogleGenAI({
      apiKey: customKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
};

async function askLLM(req: express.Request, prompt: string, options: { model?: string } = {}) {
  const provider = req.headers['x-provider'] as string || 'gemini';
  
  if (provider === 'openrouter') {
    const apiKey = req.headers['x-openrouter-key'] as string;
    const model = req.headers['x-openrouter-model'] as string || 'google/gemini-2.0-flash-001';
    
    if (!apiKey) throw new Error("OpenRouter API Key required");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ais-dev.run.app", // standard placeholder
        "X-Title": "EbookForge Studio",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } else if (provider === 'nvidia') {
    const apiKey = req.headers['x-nvidia-key'] as string;
    const model = req.headers['x-nvidia-model'] as string || 'meta/llama-3.3-70b-instruct';
    
    if (!apiKey) throw new Error("NVIDIA API Key required");

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        top_p: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`NVIDIA Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } else if (provider === 'groq') {
    const apiKey = req.headers['x-groq-key'] as string;
    const model = req.headers['x-groq-model'] as string || 'llama3-8b-8192';
    
    if (!apiKey) throw new Error("Groq API Key required");

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: model,
    });

    return completion.choices[0]?.message?.content || "";
  } else {
    // Default to Gemini
    const client = getGenAI(req);
    const model = (req.headers['x-gemini-model'] as string) || options.model || "gemini-2.0-flash";
    
    const result = await client.models.generateContent({
      model: model,
      contents: prompt
    });
    return result.text;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/generate-outline", async (req, res) => {
    try {
      const { title, audience, pages, template, tone, guidance } = req.body;
      
      // Dynamic chapter count based on page count
      // 20 pages -> 3-4 chapters
      // 60 pages -> 6-8 chapters
      // 200 pages -> 12-15 chapters
      let targetChapters = 4;
      if (pages >= 150) targetChapters = 15;
      else if (pages >= 100) targetChapters = 10;
      else if (pages >= 50) targetChapters = 7;

      let prompt = `You are a world-class book strategist. Create a high-converting JSON outline for a ${pages} page book.
      Title: "${title}"
      Target Audience: "${audience}"
      Template: "${template}"
      Tone: "${tone}"
      
      Requirements:
      - Create exactly ${targetChapters} robust chapters.
      - Each chapter must follow a logical ascension towards the final transformation.
      - "problem": The specific tactical pain point this chapter eliminates.
      - "mechanism": The unique, named process or tool used to solve the problem.
      - "outcome": The specific, measurable result for the reader.
      - "keyInsight": A "lightbulb moment" quote or realization that changes the reader's paradigm.`;
      
      if (guidance) {
        prompt += `\n\nUSER SPECIFIC GUIDANCE FOR IMPROVEMENT: "${guidance}"\nPlease incorporate this feedback into the new outline.`;
      }
 
      prompt += `\n\nDeliver ONE transformation statement. 
      Return only a JSON object with this structure:
      {
        "transformation": "string",
        "outline": [
          {
            "id": "unique-id",
            "title": "Chapter Title",
            "problem": "Problem solved",
            "mechanism": "Unique mechanism name",
            "outcome": "Outcome promise",
            "keyInsight": "The specific lightbulb moment"
          }
        ]
      }
      Do not include markdown formatting or backticks, just the JSON object.`;
 
      const response = await askLLM(req, prompt, { model: "gemini-2.5-flash" });

      let text = response.trim();
      
      // Basic cleanup in case Gemini returns markdown
      if (text.startsWith("```json")) {
        text = text.replace(/```json|```/g, "");
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Error generating outline:", error);
      if (error?.status === 429 || error?.message?.includes("quota")) {
        return res.status(429).json({ 
          error: "Quota exceeded. Please wait a moment before trying again.",
          details: error.message 
        });
      }
      res.status(500).json({ error: "Failed to generate outline" });
    }
  });

  app.post("/api/generate-chapter", async (req, res) => {
    try {
      const { 
        chapterIndex, 
        totalChapters, 
        chapterTitle, 
        mechanism, 
        outline, 
        previousSummary, 
        isIdeaMode,
        title,
        audience
      } = req.body;
      
      let prompt = "";
      // Calculate dynamic word target: (total pages - 10 for front/back) * 250 words per page / total chapters
      const wordTarget = Math.floor(((req.body.totalPages || 20) - 10) * 250 / totalChapters);

      if (isIdeaMode) {
        prompt = `You are a master ghostwriter and elite teacher. Write Chapter ${chapterIndex + 1} of ${totalChapters}: "${chapterTitle}".
        Book Title: "${title}"
        Target Audience: "${audience}"
        Target word count: ${wordTarget} words.
        
        Previous Context: ${previousSummary || "This is the start of the book."}
        Chapter Mission: Solve the problem of ${outline[chapterIndex].problem} using "${mechanism}".
        The "Lightbulb Moment" to deliver: "${outline[chapterIndex].keyInsight || 'A new way of seeing the problem'}".
        
        Structure your narrative using the "Explain -> Example -> Application" pattern:
        1) ## THE PROBLEM: Open with a visceral description of the pain readers feel and its hidden costs.
        2) ## THE BIG SHIFT: Introduce "${mechanism}" and the key insight that changes everything.
        3) ## THE ARCHITECTURE: Teach the 3-5 step process with deep logic.
        4) ## THE PROOF: A detailed case study or example with specific data/numbers.
        5) ## THE TOOLKIT: A copy-paste template (labeled TEMPLATE).
        6) ## THE RADAR: A 3-point checklist of what to watch for (labeled CHECKLIST).
        7) ## THE TRAP: One common mistake that kills progress (labeled MISTAKE TO AVOID).
        8) ## THE MOMENTUM: A 10-minute "Quick Win" action step.
        
        Style: Punchy, authoritative, second-person "You". No fluff. Use bolding for emphasis.`;
      } else {
        const userDraft = req.body.userDraft || "";
        prompt = `You are an elite editor. Rewrite this draft for Chapter ${chapterIndex + 1}: ${chapterTitle} into a professional masterwork.
        Target word count: ${wordTarget} words.
        
        Maintain the reader's stories but enforce this structure:
        1) ## THE PROBLEM (Visceral pain)
        2) ## THE BIG SHIFT (Deep logic of "${mechanism}")
        3) ## THE ARCHITECTURE (Step-by-step teaching)
        4) ## THE PROOF (Specific results/data)
        5) ## THE TOOLKIT (TEMPLATE)
        6) ## THE RADAR (CHECKLIST)
        7) ## THE TRAP (MISTAKE TO AVOID)
        8) ## THE MOMENTUM (10-min action)
        
        Incorporate this Key Insight: "${outline[chapterIndex].keyInsight || 'A new paradigm'}".
        
        Draft to transform:
        ${userDraft}`;
      }

      const chapterContent = await askLLM(req, prompt, { model: "gemini-2.5-flash" });

      const imagePromptRequest = `You are a professional art director for a high-end luxury publishing house. 
      Generate a HIGHLY DETAILED, cinemmatic, and atmospheric image prompt for Chapter "${chapterTitle}" from the book "${title}".
      
      The prompt must follow these strict artistic guidelines:
      - CONCEPT: A symbolic, minimalist representation of "${chapterTitle}". Focus on metaphors, not literal objects.
      - STYLE: Premium Studio Photography, Natural Tones (earthy beiges, soft greys, charcoal, with one accent color from the chapter's "outcome").
      - LIGHTING: Volumetric lighting, soft shadows, 85mm lens depth of field (bokeh background), professional studio setup.
      - COMPOSITION: Rule of thirds, clean negative space for potential overlay, high-end editorial feel.
      - KEYWORDS: 8k, photorealistic, raw, highly detailed texture (linen, stone, paper), masterpiece, sophisticated, clean.
      - RESTRICTIONS: NO TEXT, no people, no busy backgrounds.
      - FORMAT: --ar 16:9 
      
      Return ONLY THE PROMPT STRING.`;
      
      const imagePrompt = await askLLM(req, imagePromptRequest, { model: "gemini-2.5-flash" });

      const summaryPrompt = `Summarize the chapter content in exactly 120 words for the purpose of maintaining context for the next chapter. 
      Focus on key concepts taught and outcomes reached.
      
      Content to summarize:
      ${chapterContent}`;

      const summary = await askLLM(req, summaryPrompt, { model: "gemini-2.5-flash" });

      res.json({ content: chapterContent, summary, imagePrompt });
    } catch (error: any) {
      console.error("Error generating chapter:", error);
      if (error?.status === 429 || error?.message?.includes("quota")) {
        return res.status(429).json({ error: "Quota exceeded. Please wait a moment." });
      }
      res.status(500).json({ error: "Failed to generate chapter" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.post("/api/generate-image-prompt", async (req, res) => {
    try {
      const { title, pageTitle, content } = req.body;
      
      const prompt = `You are a professional art director for high-end ebook publishing. 
      Generate a HIGHLY DETAILED, cinemmatic, and descriptive image prompt for a book titled '${title}'.
      The specific page is titled: "${pageTitle}".
      
      Page Content Summary:
      "${content.slice(0, 500)}..."
 
      The prompt must follow these specs:
      - STYLE: Premium Studio, Natural Tones (earthy, sophisticated, clean).
      - ASPECT RATIO: --ar 16:9
      - TECHNIQUE: Professional photography (85mm lens), volumetric lighting, minimalist composition.
      - CONTENT: Symbolic representation of the chapter's teaching. No literal translations.
      - QUALITY: photorealistic, 8k, raw, masterpiece.
      - RESTRICTION: NO TEXT or typography in the image whatsoever.
 
      Return ONLY the prompt string. No descriptions or extra text.`;
 
      const response = await askLLM(req, prompt, { model: "gemini-2.5-flash" });

      res.json({ prompt: response.trim() });
    } catch (error: any) {
      console.error("Image Prompt Error:", error);
      if (error?.status === 429 || error?.message?.includes("quota")) {
        return res.status(429).json({ error: "Quota exceeded." });
      }
      res.status(500).json({ error: "Failed to generate prompt" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
