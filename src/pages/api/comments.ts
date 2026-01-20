import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";

/**
 * Twikoo 评论系统 API 处理
 * 注意：Twikoo 是客户端评论系统，服务器端 API 仅用于兼容现有代码
 */

// GET: 获取评论 - 兼容处理
export async function GET(context: APIContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const identifier = url.searchParams.get("identifier");
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

    // Twikoo 管理通过 Twikoo 自身的管理界面进行，这里返回空列表
    return new Response(
      JSON.stringify({ comments: [], total: 0, page, limit }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 公开路由：获取特定页面的评论
  // Twikoo 是客户端渲染，服务器端不存储评论数据
  // 这里返回空数组，客户端会通过 Twikoo 自身的 API 获取评论
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// POST: 提交评论 - 兼容处理
export async function POST(context: APIContext): Promise<Response> {
  // Twikoo 是客户端提交评论，服务器端不处理评论提交
  // 这里返回成功响应，实际评论提交由客户端 Twikoo 处理
  return new Response(
    JSON.stringify({
      success: true,
      message: "评论提交功能由 Twikoo 客户端处理",
    }),
    {
      status: 201,
    },
  );
}

// DELETE: 删除评论 - 兼容处理
export async function DELETE(context: APIContext): Promise<Response> {
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 403 },
    );
  }

  // Twikoo 评论删除通过 Twikoo 管理界面进行，服务器端不处理删除请求
  // 这里返回成功响应，实际删除操作由 Twikoo 管理界面处理
  return new Response(
    JSON.stringify({
      success: true,
      message: "评论删除功能由 Twikoo 管理界面处理",
    }),
    { status: 200 },
  );
}
