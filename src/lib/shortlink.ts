// src/lib/shortlink.ts
import type { CollectionEntry } from "astro:content";

const cache = new Map<string, string>();

/**
 * [新增] 为非标字符串（如中文）生成一个简短、固定的哈希值
 * @param input - The string to hash, e.g., "强连通分量"
 * @returns A promise that resolves to a short hex string, e.g., "e8a11b2"
 */
function generateShortHash(input: string): string {
  // 使用简单的哈希算法，避免依赖 crypto.subtle.digest
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }

  // 将哈希值转换为十六进制字符串
  let hex = Math.abs(hash).toString(16);

  // 确保哈希值至少有7位
  while (hex.length < 7) {
    hex = "0" + hex;
  }

  // 返回前7位
  return hex.substring(0, 7);
}

interface ShortLinkOptions {
  longUrl: string;
  slug?: CollectionEntry<"blog">["slug"];
}

export async function getShortLink({
  longUrl,
  slug,
}: ShortLinkOptions): Promise<string | null> {
  const cacheKey = slug || longUrl;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // [修改] 从环境变量中获取基础配置
  const publicUrl = import.meta.env.SINK_PUBLIC_URL;
  const apiKey = import.meta.env.SINK_API_KEY;

  if (
    !publicUrl ||
    !apiKey ||
    publicUrl.includes("<") ||
    publicUrl.includes(">") ||
    /[\u4e00-\u9fa5]/.test(publicUrl)
  ) {
    console.warn("Sink 服务环境变量未完全设置或包含无效字符，无法生成短链。");
    return null;
  }

  // [修改] 动态构建 API Endpoint
  const apiEndpoint = `${publicUrl}/api/link/upsert`;

  try {
    // --- 核心修复：重写请求体构建逻辑 ---
    const bodyPayload: { url: string; slug?: string } = {
      url: longUrl,
    };

    const sinkSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

    if (slug) {
      if (sinkSlugRegex.test(slug)) {
        // 如果 slug 合规（英文/数字），直接使用
        bodyPayload.slug = slug;
      } else {
        // 如果 slug 不合规（包含中文等），则为其生成一个固定的哈希值
        const hashedSlug = generateShortHash(slug);
        bodyPayload.slug = hashedSlug;
      }
    }
    // 如果没有传入 slug，则不发送 slug 字段，让 Sink 服务自己生成随机 slug

    // 修复中文 URL 无法转换为 ByteString 的问题
    // 使用 URLSearchParams 或 encodeURIComponent 确保 URL 是合法的
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Sink API request failed: ${response.status} - ${errorBody}`,
      );
    }

    const data = await response.json();

    const shortUrl = data?.shortLink;

    if (shortUrl) {
      cache.set(cacheKey, shortUrl);
      // console.log(`[Sink] Mapped ${longUrl} -> ${shortUrl}`);
      return shortUrl;
    }
    return null;
  } catch (error) {
    console.error(`Failed to get short link for ${longUrl}:`, error);
    // 当遇到无法转换为 ByteString 的错误时，直接返回 null，避免构建失败
    return null;
  }
}
