import type { AstroGlobal } from "astro";
import { LRUCache } from "lru-cache";
import { $fetch } from "ofetch";
import { ProxyAgent } from "undici";

// 初始化缓存
const cache = new LRUCache<string, string>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 分钟
});

// 获取环境变量的辅助函数
function getEnv(Astro: any, name: string): string | undefined {
  return import.meta.env[name] ?? Astro.locals?.runtime?.env?.[name];
}

/**
 * 从 Telegram 获取原始 HTML
 * @param Astro Astro 全局对象
 * @param options 请求参数
 * @returns 返回 HTML 字符串
 */
export async function fetchTelegramHtml(
  Astro: AstroGlobal,
  options: { before?: string; after?: string; q?: string; id?: string } = {},
): Promise<string> {
  const { before, after, q, id } = options;
  const cacheKey = JSON.stringify({ id, before, after, q });

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const host = getEnv(Astro, "TELEGRAM_HOST") ?? "t.me";
  const channel = getEnv(Astro, "CHANNEL");

  if (!channel) {
    throw new Error("CHANNEL environment variable is not set.");
  }

  const url = id
    ? `https://${host}/${channel}/${id}?embed=1&mode=tme`
    : `https://${host}/s/${channel}`;

  const proxyUrl = getEnv(Astro, "HTTP_PROXY");
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const headers = Object.fromEntries(Astro.request.headers);

  let html = "";
  try {
    // 设置完整的请求配置
    const requestOptions: any = {
      headers: {
        ...headers,
        // 添加User-Agent，模拟浏览器请求
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      query: { before, after, q },
      retry: 3,
      dispatcher,
      // 处理证书验证问题
      rejectUnauthorized: false,
      // 添加超时设置
      timeout: 10000,
    };

    console.log(`Fetching from Telegram API: ${url}`, requestOptions);
    html = await $fetch<string>(url, requestOptions);
    console.log(`Successfully fetched from Telegram API: ${url}`);
    cache.set(cacheKey, html);
  } catch (error: any) {
    console.error(`Failed to fetch from Telegram API: ${url}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response body: ${await error.response.text()}`);
    }
    // 请求失败时返回空字符串，避免网站崩溃
    html = "";
  }
  return html;
}
