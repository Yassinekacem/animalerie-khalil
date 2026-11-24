"use client";

import { useEffect, useState } from "react";
import type { Blog } from "@/app/generated/prisma/browser";
import type { Animal } from "@/app/generated/prisma/enums";

export type BlogArticle = Omit<Blog, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
type BlogList = { blogs: BlogArticle[]; total: number; page: number; totalPages: number };

export async function readBlogResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const messages = Array.isArray(data?.issues) ? data.issues.map((issue: { message: string }) => issue.message) : [];
    throw new Error(messages.join("\n") || data?.error || "La demande a échoué. Réessayez.");
  }
  if (!data) throw new Error("La réponse du serveur est invalide.");
  return data as T;
}

export function useBlogs(category: Animal | "", page: number, search = "") {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set("category", category);
  if (search.trim()) params.set("q", search.trim());
  const url = "/api/blogs?" + params;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; data: BlogList | null; error: string }>();
  const key = url + ":" + attempt;

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(readBlogResponse<BlogList>)
      .then(data => {
        if (!controller.signal.aborted) setResult({ key, data, error: "" });
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          const message = error instanceof TypeError ? "Connexion au serveur impossible." : error.message;
          setResult({ key, data: null, error: message });
        }
      });
    return () => controller.abort();
  }, [key, url]);

  const current = result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: current === null,
    reload: () => setAttempt(value => value + 1),
  };
}
