// src/pages/api/comments/like.ts
import type { APIContext } from "astro";
import { kvProxy } from "@/lib/kv-proxy";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud (仅在服务器端) - 现在是兼容函数，不做任何操作
initLeanCloud();

// 本地开发使用的内存存储
const localCommentLikesStorage = new Map<string, number>();
const localUserLikesStorage = new Map<string, Set<string>>();

export async function POST({ request }: APIContext): Promise<Response> {
  try {
    const { commentId, commentType, deviceId } = await request.json();

    if (!commentId || !deviceId || !commentType) {
      return new Response(
        JSON.stringify({ success: false, message: "缺少必要参数" }),
        { status: 400 },
      );
    }

    let totalLikes = 0;
    let isLiked = false;

    // 生成唯一的用户点赞标识
    const userLikeKey = `${deviceId}:${commentId}`;

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      // 1. 检查用户是否已经点赞
      const userLikeStr = await kvProxy.get<string>(
        `user_like:${deviceId}:${commentId}`,
      );
      const existingLike = Boolean(userLikeStr);

      // 2. 获取当前点赞数
      const currentLikesStr = await kvProxy.get<string>(
        `comment_likes:${commentId}`,
      );
      const currentLikes = currentLikesStr ? Number(currentLikesStr) : 0;

      if (existingLike) {
        // 如果已存在，则取消点赞 (删除记录)
        await kvProxy.put(`user_like:${deviceId}:${commentId}`, "");

        // 减少点赞数
        totalLikes = Math.max(0, currentLikes - 1);
        await kvProxy.put(`comment_likes:${commentId}`, totalLikes.toString());

        isLiked = false;
      } else {
        // 如果不存在，则创建新点赞记录
        await kvProxy.put(`user_like:${deviceId}:${commentId}`, "1");

        // 增加点赞数
        totalLikes = currentLikes + 1;
        await kvProxy.put(`comment_likes:${commentId}`, totalLikes.toString());

        isLiked = true;
      }
    } else {
      // 本地开发环境：使用内存存储
      // 检查是否已经点赞
      const userLikedSet =
        localUserLikesStorage.get(userLikeKey) || new Set<string>();
      const currentLikes = localCommentLikesStorage.get(commentId) || 0;

      if (userLikedSet.has(commentId)) {
        // 如果已存在，则取消点赞
        userLikedSet.delete(commentId);
        localUserLikesStorage.set(userLikeKey, userLikedSet);

        // 减少点赞数
        totalLikes = Math.max(0, currentLikes - 1);
        localCommentLikesStorage.set(commentId, totalLikes);

        isLiked = false;
      } else {
        // 如果不存在，则创建新点赞记录
        userLikedSet.add(commentId);
        localUserLikesStorage.set(userLikeKey, userLikedSet);

        // 增加点赞数
        totalLikes = currentLikes + 1;
        localCommentLikesStorage.set(commentId, totalLikes);

        isLiked = true;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        likes: totalLikes,
        isLiked, // 返回当前的点赞状态
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing like:", error);
    return new Response(
      JSON.stringify({ success: false, message: "服务器内部错误" }),
      { status: 500 },
    );
  }
}
