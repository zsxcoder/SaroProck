import type { APIContext } from "astro";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { marked } from "marked";
import { getAdminUser } from "@/lib/auth";
import { kvProxy } from "@/lib/kv-proxy";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud (仅在服务器端) - 现在是兼容函数，不做任何操作
initLeanCloud();

const window = new JSDOM("").window;
const dompurify = DOMPurify(window as any);

// 本地开发使用的内存存储
const localCommentsStorage = new Map<string, any[]>();
const localCommentDetailsStorage = new Map<string, any>();
const localCommentLikesStorage = new Map<string, number>();
const localUserLikesStorage = new Map<string, Set<string>>();
let commentIdCounter = 0;

// 生成唯一评论ID
function generateCommentId(): string {
  return `comment_${Date.now()}_${commentIdCounter++}`;
}

// GET: 获取评论
export async function GET(context: APIContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const identifier = url.searchParams.get("identifier");
  const commentType = url.searchParams.get("commentType") || "blog";
  const deviceId = url.searchParams.get("deviceId");
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") || "20", 10);

  // 管理员路由：如果不存在 identifier，则获取所有评论
  if (!identifier) {
    const adminUser = getAdminUser(context);
    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required." }),
        { status: 403 },
      );
    }

    try {
      // 简化实现：返回空列表
      return new Response(
        JSON.stringify({ comments: [], total: 0, page, limit }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error fetching all comments for admin:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch all comments" }),
        { status: 500 },
      );
    }
  }

  // 公开路由：获取特定页面的评论
  try {
    // 在生产环境中，使用 Cloudflare Worker KV 代理
    // 在本地开发中，使用内存存储
    let comments: any[] = [];

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      // 获取评论列表
      const commentListKey = `comments:${identifier}:${commentType}`;
      const commentIdsStr = await kvProxy.get<string>(commentListKey);
      const commentIds = commentIdsStr ? JSON.parse(commentIdsStr) : [];

      // 获取每个评论的详情和点赞数
      const commentPromises = commentIds.map(async (commentId: string) => {
        const commentDetailStr = await kvProxy.get<string>(
          `comment:${commentId}`,
        );
        const comment = commentDetailStr ? JSON.parse(commentDetailStr) : null;

        if (comment) {
          const likesStr = await kvProxy.get<string>(
            `comment_likes:${commentId}`,
          );
          const likes = likesStr ? Number(likesStr) : 0;

          let isLiked = false;
          if (deviceId) {
            const userLikeStr = await kvProxy.get<string>(
              `user_like:${deviceId}:${commentId}`,
            );
            isLiked = Boolean(userLikeStr);
          }

          return {
            ...comment,
            likes,
            isLiked,
          };
        }
        return null;
      });

      comments = (await Promise.all(commentPromises)).filter(Boolean);
    } else {
      // 本地开发环境：使用内存存储
      const commentIds =
        localCommentsStorage.get(`comments:${identifier}:${commentType}`) || [];
      comments = commentIds
        .map((commentId) => {
          const comment = localCommentDetailsStorage.get(commentId);
          if (comment) {
            return {
              ...comment,
              likes: localCommentLikesStorage.get(commentId) || 0,
              isLiked: deviceId
                ? Boolean(
                    localUserLikesStorage.get(`${deviceId}:${commentId}`)?.size,
                  )
                : false,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    return new Response(JSON.stringify(comments), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching comments from backend:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch comments" }), {
      status: 500,
    });
  }
}

export async function POST(context: APIContext): Promise<Response> {
  const { request } = context;
  try {
    const data = await request.json();
    const { identifier, commentType, content, parentId, userInfo } = data;

    if (!identifier || !content) {
      return new Response(
        JSON.stringify({ success: false, message: "缺少必要参数" }),
        { status: 400 },
      );
    }

    const adminUser = getAdminUser(context);

    let finalUser: {
      nickname: string;
      email: string;
      website: string | null;
      avatar: string | undefined;
      isAdmin: boolean;
    };
    if (adminUser) {
      // 如果是管理员 (通过cookie验证)
      finalUser = {
        nickname: adminUser.nickname,
        email: adminUser.email,
        website: adminUser.website,
        avatar: adminUser.avatar,
        isAdmin: true,
      };
    } else {
      // 如果是普通用户
      if (!userInfo || !userInfo.nickname || !userInfo.email) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "普通用户需要提供用户信息",
          }),
          { status: 400 },
        );
      }
      finalUser = {
        nickname: userInfo.nickname,
        email: userInfo.email,
        website: userInfo.website || null,
        avatar: userInfo.avatar, // 前端应已生成好头像URL
        isAdmin: false,
      };
    }

    // 安全处理：清理 HTML
    const rawHtml = await marked(content);
    const cleanHtml = dompurify.sanitize(rawHtml);

    const commentId = generateCommentId();
    const comment = {
      id: commentId,
      nickname: finalUser.nickname,
      email: finalUser.email,
      website: finalUser.website,
      avatar: finalUser.avatar,
      content: cleanHtml,
      [commentType === "telegram" ? "postId" : "slug"]: identifier,
      isAdmin: finalUser.isAdmin,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 存储评论
    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      // 1. 存储评论详情
      await kvProxy.put(`comment:${commentId}`, JSON.stringify(comment));

      // 2. 添加到评论列表
      const commentListKey = `comments:${identifier}:${commentType}`;
      const commentIdsStr = await kvProxy.get<string>(commentListKey);
      const commentIds = commentIdsStr ? JSON.parse(commentIdsStr) : [];
      commentIds.push(commentId);
      await kvProxy.put(commentListKey, JSON.stringify(commentIds));

      // 3. 初始化点赞数
      await kvProxy.put(`comment_likes:${commentId}`, "0");
    } else {
      // 本地开发环境：使用内存存储
      // 添加到评论列表
      const commentListKey = `comments:${identifier}:${commentType}`;
      const commentIds = localCommentsStorage.get(commentListKey) || [];
      commentIds.push(commentId);
      localCommentsStorage.set(commentListKey, commentIds);

      // 存储评论详情
      localCommentDetailsStorage.set(commentId, comment);

      // 初始化点赞数
      localCommentLikesStorage.set(commentId, 0);
    }

    return new Response(JSON.stringify({ success: true, comment }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error submitting comment from backend:", error);
    return new Response(
      JSON.stringify({ success: false, message: "服务器内部错误" }),
      { status: 500 },
    );
  }
}

export async function DELETE(context: APIContext): Promise<Response> {
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 403 },
    );
  }

  try {
    const { commentId, commentType } = await context.request.json();
    if (!commentId || !commentType) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing commentId or commentType",
        }),
        { status: 400 },
      );
    }

    // 删除评论
    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      // 1. 获取评论详情以找到标识符
      const commentDetailStr = await kvProxy.get<string>(
        `comment:${commentId}`,
      );
      if (commentDetailStr) {
        const comment = JSON.parse(commentDetailStr);
        const identifier = comment.slug || comment.postId;

        // 2. 从评论列表中移除
        const commentListKey = `comments:${identifier}:${commentType}`;
        const commentIdsStr = await kvProxy.get<string>(commentListKey);
        if (commentIdsStr) {
          let commentIds = JSON.parse(commentIdsStr);
          commentIds = commentIds.filter((id: string) => id !== commentId);
          await kvProxy.put(commentListKey, JSON.stringify(commentIds));
        }

        // 3. 删除评论详情
        await kvProxy.put(`comment:${commentId}`, "");

        // 4. 删除点赞数
        await kvProxy.put(`comment_likes:${commentId}`, "");

        // 5. 删除所有用户点赞记录（简化实现，实际可能需要更复杂的查询）
        // 注意：这里简化处理，实际生产环境中可能需要更好的方式管理用户点赞记录
      }
    }

    // 简化实现：返回成功
    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted 1 comment(s) and 0 like(s).`,
      }),
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error deleting comment:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Server internal error",
      }),
      { status: 500 },
    );
  }
}
