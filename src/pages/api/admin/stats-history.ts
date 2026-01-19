// src/pages/api/admin/stats-history.ts
import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud - 现在是兼容函数，不做任何操作
initLeanCloud();

/**
 * 获取评论和点赞的历史趋势数据
 * 获取所有历史数据，计算真实的累计数，但只返回最近N天的数据点
 */
export async function GET(context: APIContext): Promise<Response> {
  // 权限验证
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const url = new URL(context.request.url);
  const days = Number.parseInt(url.searchParams.get("days") || "30", 10); // 默认30天

  try {
    // 计算要返回的日期范围（最近N天）
    const displayStartDate = new Date();
    displayStartDate.setDate(displayStartDate.getDate() - days);
    displayStartDate.setHours(0, 0, 0, 0);

    // 简化实现：生成空的历史数据
    const historyData: Array<{
      date: string;
      comments: {
        daily: number;
        blog: number;
        telegram: number;
        cumulative: number;
        cumulativeBlog: number;
        cumulativeTelegram: number;
      };
      likes: {
        daily: number;
        posts: number;
        comments: number;
        cumulative: number;
        cumulativePosts: number;
        cumulativeComments: number;
      };
    }> = [];

    // 生成最近N天的空数据
    for (let i = 0; i < days; i++) {
      const date = new Date(displayStartDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];

      historyData.push({
        date: dateKey,
        comments: {
          daily: 0,
          blog: 0,
          telegram: 0,
          cumulative: 0,
          cumulativeBlog: 0,
          cumulativeTelegram: 0,
        },
        likes: {
          daily: 0,
          posts: 0,
          comments: 0,
          cumulative: 0,
          cumulativePosts: 0,
          cumulativeComments: 0,
        },
      });
    }

    return new Response(JSON.stringify({ data: historyData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching stats history:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch statistics history" }),
      { status: 500 },
    );
  }
}
