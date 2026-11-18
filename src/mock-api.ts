// ============================================================
// Практика 4.1: Имитация сети
// ============================================================
// Читаем и пишем localStorage асинхронно, как будто ходим на сервер.
// ============================================================

import { Book } from "./task1-types";

const STORAGE_KEY = 'catalog';

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchBooks(): Promise<Book[]> {
  await delay(800);

  // В 20% случаев имитируем сбой сети
  if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  const parsed = JSON.parse(saved);
  // Старый формат из практики 3: { id, books }
  return Array.isArray(parsed) ? parsed : parsed.books ?? [];
}

export async function saveBooks(books: Book[]): Promise<void> {
  await delay(500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}
