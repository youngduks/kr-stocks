// 노트 저장 — AsyncStorage. 목록은 가벼운 메타 인덱스로, 본문은 노트별 키로 나눠 둔다.
// (녹취록이 통째로 들어간 배열 하나를 매번 파싱하면 목록 화면이 느려진다.)

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Note, NoteMeta } from "../types";

const INDEX_KEY = "voicenote:index";
const noteKey = (id: string) => `voicenote:note:${id}`;

function toMeta(note: Note): NoteMeta {
  return {
    id: note.id,
    mode: note.mode,
    title: note.title,
    createdAt: note.createdAt,
    durationSec: note.durationSec,
    headline: note.finalNote?.headline ?? note.summary?.headline ?? "",
  };
}

export async function listNotes(): Promise<NoteMeta[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as NoteMeta[];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.createdAt - a.createdAt)
      : [];
  } catch {
    return [];
  }
}

export async function getNote(id: string): Promise<Note | null> {
  const raw = await AsyncStorage.getItem(noteKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Note;
  } catch {
    return null;
  }
}

export async function saveNote(note: Note): Promise<void> {
  await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));
  const index = await listNotes();
  const next = [toMeta(note), ...index.filter((m) => m.id !== note.id)];
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export async function deleteNote(id: string): Promise<void> {
  await AsyncStorage.removeItem(noteKey(id));
  const index = await listNotes();
  await AsyncStorage.setItem(
    INDEX_KEY,
    JSON.stringify(index.filter((m) => m.id !== id)),
  );
}

export function newNoteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
