import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud - 现在是兼容函数，不做任何操作
initLeanCloud();

export async function GET(context: APIContext): Promise<Response> {
  // 权限验证
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  // 从环境变量中获取 Sink 基础配置
  const sinkBaseUrl = import.meta.env.SINK_PUBLIC_URL;
  const sinkApiKey = import.meta.env.SINK_API_KEY;

  try {
    // --- Cloudflare KV 数据获取 ---
    // 简化实现：返回模拟数据

    // 动态构建 Sink Counters URL
    const sinkCountersUrl = sinkBaseUrl
      ? `${sinkBaseUrl}/api/stats/counters`
      : null;

    // 并行执行所有数据获取请求
    let totalSinkViews = 0;
    if (sinkApiKey && sinkCountersUrl) {
      try {
        const sinkCountersResponse = await fetch(sinkCountersUrl, {
          headers: { Authorization: `Bearer ${sinkApiKey}` },
        });
        if (sinkCountersResponse.ok) {
          const countersData = await sinkCountersResponse.json();
          if (countersData.data?.[0]) {
            totalSinkViews = countersData.data[0].visits || 0;
          }
        }
      } catch (error) {
        console.error("Error fetching Sink counters:", error);
      }
    }

    // --- 组合最终数据 ---
    // 简化实现：返回模拟数据或空数据
    const stats = {
      comments: {
        blog: 0,
        telegram: 0,
        total: 0,
      },
      likes: {
        posts: 0,
        comments: 0,
        total: 0,
      },
      sink: {
        totalViews: totalSinkViews,
      },
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch statistics" }),
      { status: 500 },
    );
  }
}
