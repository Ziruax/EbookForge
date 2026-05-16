import { BookOutline } from "../types";

const getHeaders = () => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const customKey = localStorage.getItem("gemini_api_key");
  if (customKey) {
    headers["x-gemini-key"] = customKey;
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
