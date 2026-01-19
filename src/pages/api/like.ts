// src/pages/api/like.ts
import type { APIContext } from "astro";
import { kvProxy } from "@/lib/kv-proxy";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud (仅在服务器端) - 现在是兼容函数，不做任何操作
initLeanCloud();

// 使用 Cloudflare Worker KV 代理实现，本地开发使用内存存储

// 本地开发使用的内存存储
const localLikeStorage = new Map<string, number>();

// --- GET: 获取帖子的初始点赞状态 ---
export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");

  if (!postId) {
    return new Response(JSON.stringify({ error: "缺少 postId" }), {
      status: 400,
    });
  }

  try {
    // 在生产环境中，使用 Cloudflare Worker KV 代理
    // 在本地开发中，使用内存存储
    let likeCount = 0;

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      const value = await kvProxy.get<string>(`likes:${postId}`);
      likeCount = value ? Number(value) : 0;
    } else {
      // 本地开发环境：使用内存存储
      likeCount = localLikeStorage.get(postId) || 0;
    }

    return new Response(JSON.stringify({ likeCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching like status:", error);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
    });
  }
}

// --- POST: 根据 delta 调整帖子的点赞总数 ---
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    const { postId, delta } = await request.json();

    if (!postId || typeof delta !== "number" || !Number.isFinite(delta)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "缺少 postId 或非法的 delta",
        }),
        { status: 400 },
      );
    }

    let likeCount = 0;

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      const newValue = await kvProxy.increment(`likes:${postId}`, delta);
      likeCount = newValue || 0;
    } else {
      // 本地开发环境：使用内存存储
      const currentLikes = localLikeStorage.get(postId) || 0;
      likeCount = Math.max(0, currentLikes + delta);
      localLikeStorage.set(postId, likeCount);
    }

    return new Response(JSON.stringify({ success: true, likeCount }), {
      status: 200,
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return new Response(
      JSON.stringify({ success: false, message: "服务器内部错误" }),
      { status: 500 },
    );
  }
}
