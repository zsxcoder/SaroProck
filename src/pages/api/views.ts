import type { APIContext } from "astro";
import { kvProxy } from "@/lib/kv-proxy";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud（仅服务器端）- 现在是兼容函数，不做任何操作
initLeanCloud();

// 使用 Cloudflare Worker KV 代理实现，本地开发使用内存存储

// 本地开发使用的内存存储
const localPostViewsStorage = new Map<string, number>();
const localDailyViewsStorage = new Map<string, number>();

function getAsiaShanghaiDateString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijing = new Date(utc + 8 * 60 * 60000);
  const year = beijing.getFullYear();
  const month = String(beijing.getMonth() + 1).padStart(2, "0");
  const day = String(beijing.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 获取某篇文章当前总浏览量
export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "缺少 slug 参数" }), {
      status: 400,
    });
  }

  try {
    // 在生产环境中，使用 Cloudflare Worker KV 代理
    // 在本地开发中，使用内存存储
    let totalViews = 0;

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      const value = await kvProxy.get<string>(`views:post:${slug}`);
      totalViews = value ? Number(value) : 0;
    } else {
      // 本地开发环境：使用内存存储
      totalViews = localPostViewsStorage.get(slug) || 0;
    }

    return new Response(JSON.stringify({ slug, totalViews }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching post views:", error);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
    });
  }
}

// 记录一次浏览：
// - 按 slug 的总浏览量 +1（前端保证每个设备同一篇只记一次）
// - 按当天东八区日期的全站浏览量 +1
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return new Response(
        JSON.stringify({ success: false, message: "缺少 slug 参数" }),
        { status: 400 },
      );
    }

    const now = new Date();
    const dateKey = getAsiaShanghaiDateString();

    let totalViews = 0;
    let dailyViews = 0;

    if (import.meta.env.PROD) {
      // Vercel 生产环境：使用 Cloudflare Worker KV 代理
      // 更新按 slug 统计的总浏览数
      const currentPostViewsStr = await kvProxy.get<string>(
        `views:post:${slug}`,
      );
      const currentPostViews = currentPostViewsStr
        ? Number(currentPostViewsStr)
        : 0;
      totalViews = currentPostViews + 1;
      await kvProxy.put(`views:post:${slug}`, totalViews.toString());

      // 更新按日期统计的全站浏览数
      const currentDailyViewsStr = await kvProxy.get<string>(
        `views:daily:${dateKey}`,
      );
      const currentDailyViews = currentDailyViewsStr
        ? Number(currentDailyViewsStr)
        : 0;
      dailyViews = currentDailyViews + 1;
      await kvProxy.put(`views:daily:${dateKey}`, dailyViews.toString());
    } else {
      // 本地开发环境：使用内存存储
      // 更新按 slug 统计的总浏览数
      const currentPostViews = localPostViewsStorage.get(slug) || 0;
      totalViews = currentPostViews + 1;
      localPostViewsStorage.set(slug, totalViews);

      // 更新按日期统计的全站浏览数
      const currentDailyViews = localDailyViewsStorage.get(dateKey) || 0;
      dailyViews = currentDailyViews + 1;
      localDailyViewsStorage.set(dateKey, dailyViews);
    }

    return new Response(
      JSON.stringify({
        success: true,
        slug,
        totalViews,
        dailyViews,
        date: dateKey,
        timestamp: now.toISOString(),
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error recording post view:", error);
    return new Response(
      JSON.stringify({ success: false, message: "服务器内部错误" }),
      { status: 500 },
    );
  }
}
