// src/pages/api/comments/like.ts
import type { APIContext } from "astro";

/**
 * 评论点赞 API - 兼容处理
 * 注意：Twikoo 评论系统会自己处理评论点赞，这里仅返回兼容响应
 */
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    const { commentId, commentType, deviceId } = await request.json();

    if (!commentId || !deviceId || !commentType) {
      return new Response(
        JSON.stringify({ success: false, message: "缺少必要参数" }),
        { status: 400 },
      );
    }

    // Twikoo 会自己处理评论点赞，这里返回兼容的响应
    // 返回默认值，客户端会通过 Twikoo 自身的 API 获取真实点赞数据
    return new Response(
      JSON.stringify({
        success: true,
        likes: 0,
        isLiked: false,
        message: "评论点赞功能由 Twikoo 客户端处理",
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
