"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const MIN_SUBMIT_MS = 2500; // 폼 로드 후 2.5초 이내 제출 = 봇으로 간주

export function NewPostForm() {
  const router = useRouter();
  const mountedAt = useRef(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — 실제 사용자에겐 안 보임
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (website.trim() !== "") return; // 허니팟 걸림 — 조용히 무시
    if (Date.now() - mountedAt.current < MIN_SUBMIT_MS) {
      setError("잠시 후 다시 시도해주세요.");
      return;
    }
    if (!nickname.trim() || !password.trim() || !title.trim() || !body.trim()) {
      setError("닉네임/비밀번호/제목/내용을 모두 입력해주세요.");
      return;
    }
    if (password.length < 4) {
      setError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        setUploadProgress(true);
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const blob = await upload(`community/${Date.now()}-${safeName}`, imageFile, {
          access: "public",
          handleUploadUrl: "/api/community/upload",
        });
        imageUrl = blob.url;
        setUploadProgress(false);
      }

      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password, title, body, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "게시글 작성에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      router.push(`/community/${data.id}`);
    } catch (err) {
      setError("업로드 또는 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
      setSubmitting(false);
      setUploadProgress(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* 허니팟 — 스크린리더/실사용자에겐 노출 안 됨 */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-dim mb-1.5">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="닉네임"
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-line text-sm text-text focus:outline-none focus:border-accent-blue"
          />
        </div>
        <div>
          <label className="block text-xs text-text-dim mb-1.5">비밀번호 (삭제 확인용)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={64}
            placeholder="4자 이상"
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-line text-sm text-text focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-dim mb-1.5">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder="제목을 입력하세요"
          className="w-full px-3 py-2 rounded-lg bg-bg-card border border-line text-sm text-text focus:outline-none focus:border-accent-blue"
        />
      </div>

      <div>
        <label className="block text-xs text-text-dim mb-1.5">내용</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={10}
          placeholder="내용을 입력하세요"
          className="w-full px-3 py-2 rounded-lg bg-bg-card border border-line text-sm text-text focus:outline-none focus:border-accent-blue resize-y"
        />
        <div className="text-[10px] text-text-dim mt-1 text-right">{body.length}/5000</div>
      </div>

      <div>
        <label className="block text-xs text-text-dim mb-1.5">
          💰 수익인증 이미지 <span className="text-text-dim/60">(선택, 최대 8MB)</span>
        </label>
        {imagePreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="첨부 이미지 미리보기" className="max-h-64 rounded-lg border border-line" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-card border border-line text-text-dim hover:text-text text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ) : (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={onPickImage}
            className="w-full text-sm text-text-dim file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-line file:bg-bg-card file:text-text-dim file:text-xs hover:file:text-text"
          />
        )}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-xs">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-lg bg-accent-blue text-white text-sm font-bold hover:brightness-110 transition disabled:opacity-50"
      >
        {uploadProgress ? "이미지 업로드 중…" : submitting ? "등록 중…" : "등록하기"}
      </button>
    </form>
  );
}
