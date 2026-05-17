import { BookOutline } from "../types";

const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  const provider = localStorage.getItem("llm_provider") || "gemini";
  headers["x-provider"] = provider;

  if (provider === "openrouter") {
    const orKey = localStorage.getItem("openrouter_api_key");
    const orModel = localStorage.getItem("openrouter_model");
    if (orKey) headers["x-openrouter-key"] = orKey;
    if (orModel) headers["x-openrouter-model"] = orModel;
  } else if (provider === "groq") {
    const groqKey = localStorage.getItem("groq_api_key");
    const groqModel = localStorage.getItem("groq_model");
    if (groqKey) headers["x-groq-key"] = groqKey;
    if (groqModel) headers["x-groq-model"] = groqModel;
  } else if (provider === "nvidia") {
    const nvKey = localStorage.getItem("nvidia_api_key");
    const nvModel = localStorage.getItem("nvidia_model");
    if (nvKey) headers["x-nvidia-key"] = nvKey;
    if (nvModel) headers["x-nvidia-model"] = nvModel;
  } else {
    // gemini
    const customKey = localStorage.getItem("gemini_api_key");
    const geminiModel = localStorage.getItem("gemini_model");
    if (customKey) headers["x-gemini-key"] = customKey;
    if (geminiModel) headers["x-gemini-model"] = geminiModel;
  }
  
  return headers;
};

export async function generateOutline(data: {
  title: string;
  audience: string;
  pages: number;
  template: string;
  tone: string;
  guidance?: string;
}) {
  const response = await fetch("/api/generate-outline", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate outline");
  }
  return await response.json() as BookOutline;
}

export async function generateChapter(data: {
  chapterIndex: number;
  totalChapters: number;
  chapterTitle: string;
  mechanism: string;
  outline: any[];
  previousSummary: string;
  isIdeaMode: boolean;
  title: string;
  audience: string;
  userDraft?: string;
  totalPages?: number;
}) {
  const response = await fetch("/api/generate-chapter", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate chapter");
  }
  return await response.json() as { content: string; summary: string; imagePrompt?: string };
}

export async function generateImagePrompt(params: {
  title: string;
  pageTitle: string;
  content: string;
}) {
  const response = await fetch("/api/generate-image-prompt", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate image prompt");
  }
  return await response.json() as { prompt: string };
}
