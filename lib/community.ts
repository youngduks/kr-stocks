// 커뮤니티룸 — Upstash Redis 기반 (visitorStats.ts와 동일 인스턴스, "community:" 네임스페이스로 분리).
// 계정 시스템 없음 — 닉네임+비밀번호(글 삭제 확인용)만 쓰는 경량 게시판 (국내 구형 게시판 UX).

import { Redis } from "@upstash/redis";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const FALLBACK_URL = "https://frank-liger-120993.upstash.io";

let _redis: Redis | null = null;
function redis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || FALLBACK_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export class ValidationError extends Error {}

export const NICKNAME_MAX = 20;
export const TITLE_MAX = 100;
export const BODY_MAX = 5000;
export const COMMENT_MAX = 1000;
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 64;
export const PAGE_SIZE = 20;
export const REPORT_HIDE_THRESHOLD = 5;
export const RATE_LIMIT_POST_SEC = 30;
export const RATE_LIMIT_COMMENT_SEC = 5;

type CommunityPost = {
  id: string;
  nickname: string;
  passwordHash: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: number;
  ip: string;
};

type CommunityComment = {
  id: string;
  postId: string;
  nickname: string;
  passwordHash: string;
  body: string;
  createdAt: number;
  ip: string;
};

export type PublicPost = Omit<CommunityPost, "passwordHash" | "ip">;
export type PublicComment = Omit<CommunityComment, "passwordHash" | "ip">;
export type PostSummary = Pick<PublicPost, "id" | "nickname" | "title" | "createdAt"> & {
  commentCount: number;
  hasImage: boolean;
};

const kPostSeq = "community:post:seq";
const kCommentSeq = "community:comment:seq";
const kPosts = "community:posts"; // ZSET score=createdAt member=id
const kPost = (id: string) => `community:post:${id}`;
const kPostComments = (id: string) => `community:post:${id}:comments`; // LIST of comment ids
const kComment = (id: string) => `community:comment:${id}`;
const kReporters = (id: string) => `community:post:${id}:reporters`; // SET
const kRateLimit = (kind: string, ip: string) => `community:rl:${kind}:${ip}`;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function toPublicPost(p: CommunityPost): PublicPost {
  const { passwordHash, ip, ...pub } = p;
  return pub;
}

function toPublicComment(c: CommunityComment): PublicComment {
  const { passwordHash, ip, ...pub } = c;
  return pub;
}

function requireLen(label: string, v: string, min: number, max: number) {
  const trimmed = v.trim();
  if (trimmed.length < min) throw new ValidationError(`${label}은(는) 최소 ${min}자 이상이어야 합니다.`);
  if (trimmed.length > max) throw new ValidationError(`${label}은(는) 최대 ${max}자까지 가능합니다.`);
  return trimmed;
}

/** 30초/5초 등 윈도 내 중복 요청 차단 — SET NX+EX 원자적 체크. true = 허용. */
export async function checkRateLimit(kind: "post" | "comment", ip: string): Promise<boolean> {
  const r = redis();
  if (!r) return true; // Redis 미가용 시 열어둠 (기능 자체를 막지 않음)
  const seconds = kind === "post" ? RATE_LIMIT_POST_SEC : RATE_LIMIT_COMMENT_SEC;
  const ok = await r.set(kRateLimit(kind, ip), "1", { nx: true, ex: seconds });
  return ok === "OK";
}

export async function listPosts(
  cursor?: number
): Promise<{ posts: PostSummary[]; nextCursor: number | null }> {
  const r = redis();
  if (!r) return { posts: [], nextCursor: null };
  const max = cursor ?? "+inf";
  // ZRANGE ... REV BYSCORE — cursor 미만(직전 페이지 마지막 점수 제외)부터 최신순
  const ids = await r.zrange<string[]>(kPosts, max, "-inf", {
    byScore: true,
    rev: true,
    offset: cursor ? 1 : 0,
    count: PAGE_SIZE + 1,
  });
  if (!ids || ids.length === 0) return { posts: [], nextCursor: null };
  const hasMore = ids.length > PAGE_SIZE;
  const pageIds = hasMore ? ids.slice(0, PAGE_SIZE) : ids;

  const pipeline = r.pipeline();
  for (const id of pageIds) {
    pipeline.get<CommunityPost>(kPost(id));
    pipeline.llen(kPostComments(id));
    pipeline.scard(kReporters(id));
  }
  const results = await pipeline.exec<[CommunityPost | null, number, number][]>();

  const posts: PostSummary[] = [];
  let lastScore: number | null = null;
  for (let i = 0; i < pageIds.length; i++) {
    const post = results[i * 3] as unknown as CommunityPost | null;
    const commentCount = (results[i * 3 + 1] as unknown as number) ?? 0;
    const reportCount = (results[i * 3 + 2] as unknown as number) ?? 0;
    if (!post) continue;
    lastScore = post.createdAt;
    if (reportCount >= REPORT_HIDE_THRESHOLD) continue; // 신고 누적 게시글 목록에서 숨김
    posts.push({
      id: post.id,
      nickname: post.nickname,
      title: post.title,
      createdAt: post.createdAt,
      commentCount,
      hasImage: !!post.imageUrl,
    });
  }
  return { posts, nextCursor: hasMore ? lastScore : null };
}

export async function getPost(id: string): Promise<PublicPost | null> {
  const r = redis();
  if (!r) return null;
  const [post, reportCount] = await Promise.all([
    r.get<CommunityPost>(kPost(id)),
    r.scard(kReporters(id)),
  ]);
  if (!post) return null;
  if (reportCount >= REPORT_HIDE_THRESHOLD) return null;
  return toPublicPost(post);
}

export async function createPost(input: {
  nickname: string;
  password: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  ip: string;
}): Promise<PublicPost> {
  const r = redis();
  if (!r) throw new ValidationError("일시적으로 게시판을 이용할 수 없습니다.");
  const nickname = requireLen("닉네임", input.nickname, 1, NICKNAME_MAX);
  const title = requireLen("제목", input.title, 1, TITLE_MAX);
  const body = requireLen("내용", input.body, 1, BODY_MAX);
  if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
    throw new ValidationError(`비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.`);
  }
  const id = String(await r.incr(kPostSeq));
  const post: CommunityPost = {
    id,
    nickname,
    passwordHash: hashPassword(input.password),
    title,
    body,
    imageUrl: input.imageUrl ?? null,
    createdAt: Date.now(),
    ip: input.ip,
  };
  await Promise.all([r.set(kPost(id), post), r.zadd(kPosts, { score: post.createdAt, member: id })]);
  return toPublicPost(post);
}

export async function deletePost(id: string, password: string): Promise<boolean> {
  const r = redis();
  if (!r) return false;
  const post = await r.get<CommunityPost>(kPost(id));
  if (!post) return false;
  if (!verifyPassword(password, post.passwordHash)) return false;
  const commentIds = await r.lrange<string>(kPostComments(id), 0, -1);
  const pipeline = r.pipeline();
  pipeline.del(kPost(id));
  pipeline.zrem(kPosts, id);
  pipeline.del(kPostComments(id));
  pipeline.del(kReporters(id));
  for (const cid of commentIds ?? []) pipeline.del(kComment(cid));
  await pipeline.exec();
  return true;
}

export async function listComments(postId: string): Promise<PublicComment[]> {
  const r = redis();
  if (!r) return [];
  const ids = await r.lrange<string>(kPostComments(postId), 0, -1);
  if (!ids || ids.length === 0) return [];
  const pipeline = r.pipeline();
  for (const id of ids) pipeline.get<CommunityComment>(kComment(id));
  const results = (await pipeline.exec<(CommunityComment | null)[]>()) as unknown as (CommunityComment | null)[];
  return results.filter((c): c is CommunityComment => !!c).map(toPublicComment);
}

export async function createComment(input: {
  postId: string;
  nickname: string;
  password: string;
  body: string;
  ip: string;
}): Promise<PublicComment> {
  const r = redis();
  if (!r) throw new ValidationError("일시적으로 게시판을 이용할 수 없습니다.");
  const post = await r.get<CommunityPost>(kPost(input.postId));
  if (!post) throw new ValidationError("존재하지 않는 게시글입니다.");
  const nickname = requireLen("닉네임", input.nickname, 1, NICKNAME_MAX);
  const body = requireLen("댓글", input.body, 1, COMMENT_MAX);
  if (input.password.length < PASSWORD_MIN || input.password.length > PASSWORD_MAX) {
    throw new ValidationError(`비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 합니다.`);
  }
  const id = String(await r.incr(kCommentSeq));
  const comment: CommunityComment = {
    id,
    postId: input.postId,
    nickname,
    passwordHash: hashPassword(input.password),
    body,
    createdAt: Date.now(),
    ip: input.ip,
  };
  await Promise.all([r.set(kComment(id), comment), r.rpush(kPostComments(input.postId), id)]);
  return toPublicComment(comment);
}

export async function deleteComment(id: string, postId: string, password: string): Promise<boolean> {
  const r = redis();
  if (!r) return false;
  const comment = await r.get<CommunityComment>(kComment(id));
  if (!comment || comment.postId !== postId) return false;
  if (!verifyPassword(password, comment.passwordHash)) return false;
  await Promise.all([r.del(kComment(id)), r.lrem(kPostComments(postId), 1, id)]);
  return true;
}

export async function reportPost(id: string, fingerprint: string): Promise<{ count: number; hidden: boolean }> {
  const r = redis();
  if (!r) return { count: 0, hidden: false };
  const exists = await r.get<CommunityPost>(kPost(id));
  if (!exists) throw new ValidationError("존재하지 않는 게시글입니다.");
  await r.sadd(kReporters(id), fingerprint);
  const count = await r.scard(kReporters(id));
  return { count, hidden: count >= REPORT_HIDE_THRESHOLD };
}
