import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud - 现在是兼容函数，不做任何操作
initLeanCloud();

export async function GET(context: APIContext): Promise<Response> {
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const url = new URL(context.request.url);
  const days = Number.parseInt(url.searchParams.get("days") || "30", 10);

  try {
    // 简化实现：生成最近N天的空数据
    const dailyData = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      dailyData.push({
        date: dateStr,
        views: 0,
      });
    }

    return new Response(JSON.stringify({ data: dailyData }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching daily views:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch daily views" }),
      { status: 500 },
    );
  }
}
