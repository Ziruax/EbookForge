import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/generate-outline", async (req, res) => {
    try {
      const client = getGenAI(req);
      const { title, audience, pages, template, tone, guidance } = req.body;
      
      let prompt = `Create a JSON outline for a ${pages} page book titled '${title}' for ${audience} using template '${template}' with a ${tone} selling tone.`;
      
      if (guidance) {
        prompt += `\n\nUSER SPECIFIC GUIDANCE FOR IMPROVEMENT: "${guidance}"\nPlease incorporate this feedback into the new outline.`;
      }
 
      prompt += `\n\nDeliver ONE transformation. 
      Return only a JSON object with this structure:
      {
        "transformation": "string",
        "outline": [
          {
            "id": "unique-id",
            "title": "Chapter Title",
            "problem": "Problem solved",
            "mechanism": "Unique mechanism name",
            "outcome": "Outcome promise"
          }
        ]
      }
      Do not include markdown formatting or backticks, just the JSON object.`;
 
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      let text = response.text.trim();
      
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
      const client = getGenAI(req);
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
      if (isIdeaMode) {
        prompt = `You are an expert teacher and direct response copywriter. Write Chapter ${chapterIndex + 1} of ${totalChapters}: "${chapterTitle}".
        Overall Book Context: Title "${title}", Audience "${audience}".
        Previous Chapter Summary: ${previousSummary || "This is the first chapter."}
        Chapter Goal: Solve the problem of ${outline[chapterIndex].problem} with mechanism "${mechanism}".
        
        Follow this strict 8-part structure:
        1) Open with the painful problem and its real cost in one paragraph.
        2) Introduce the unique mechanism [${mechanism}] and why it works.
        3) Teach a 3 to 5 step process.
        4) Include one real example with a specific number or result.
        5) Add one copy-paste template in a block labeled TEMPLATE.
        6) Add a 3-point checklist labeled CHECKLIST.
        7) Add one costly mistake labeled MISTAKE TO AVOID.
        8) End with a 10 minute quick win action.
        
        Constraints:
        - Max 900 words
        - Conversational, second person
        - No fluff, no generic advice
        - Format with clear headings for each of the 8 parts.
        - Return the content as markdown.`;
      } else {
        const userDraft = req.body.userDraft || "";
        prompt = `You are an expert teacher and direct response copywriter. Rewrite user's draft for Chapter ${chapterIndex + 1}: ${chapterTitle} using the following 8 part structure:
        1) Open with the painful problem and its real cost in one paragraph.
        2) Introduce the unique mechanism [${mechanism}] and why it works.
        3) Teach a 3 to 5 step process.
        4) Include one real example with a specific number or result.
        5) Add one copy-paste template in a box labeled TEMPLATE.
        6) Add a 3-point checklist labeled CHECKLIST.
        7) Add one costly mistake labeled MISTAKE TO AVOID.
        8) End with a 10 minute quick win action.
        Keep their stories, add the missing template, checklist, example with number, and mistake.
        
        Draft to rewrite:
        ${userDraft}
        
        Return the content as markdown.`;
      }

      const chapterResponse = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      const chapterContent = chapterResponse.text;

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
      
      const imagePromptResponse = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: imagePromptRequest
      });
      const imagePrompt = imagePromptResponse.text.trim();

      const summaryPrompt = `Summarize the chapter content in exactly 120 words for the purpose of maintaining context for the next chapter. 
      Focus on key concepts taught and outcomes reached.
      
      Content to summarize:
      ${chapterContent}`;

      const summaryResponse = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: summaryPrompt
      });
      const summary = summaryResponse.text.trim();

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
      const client = getGenAI(req);
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
 
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });

      res.json({ prompt: response.text.trim() });
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
