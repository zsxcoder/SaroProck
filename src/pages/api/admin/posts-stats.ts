// src/pages/api/admin/posts-stats.ts

import { type CollectionEntry, getCollection } from "astro:content";
import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud - 现在是兼容函数，不做任何操作
initLeanCloud();

/**
 * 获取所有文章的评论和点赞统计
 * 返回每篇文章的标识符、评论数、点赞数等信息
 */
export async function GET(context: APIContext): Promise<Response> {
  // 权限验证
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  try {
    // 获取所有博客文章
    const blogEntries = await getCollection(
      "blog",
      ({ data }: CollectionEntry<"blog">) => !data.draft,
    );
    const blogSlugs = blogEntries.map(
      (entry: CollectionEntry<"blog">) => entry.slug,
    );

    // 简化实现：只返回博客文章列表，统计数据都为0
    // 构建博客文章统计
    const blogStats = blogSlugs.map((slug: string) => {
      const entry = blogEntries.find(
        (e: CollectionEntry<"blog">) => e.slug === slug,
      );
      return {
        identifier: slug,
        type: "blog" as const,
        title: entry?.data.title || slug,
        comments: 0,
        likes: 0,
        commentLikes: 0,
        totalLikes: 0,
        views: 0,
      };
    });

    // 简化实现：没有Telegram评论
    const telegramStats: any[] = [];

    // 合并并排序（按总互动数排序：评论数 + 点赞数）
    const allStats = [...blogStats, ...telegramStats].sort((a, b) => {
      const aTotal = a.comments + a.totalLikes;
      const bTotal = b.comments + b.totalLikes;
      return bTotal - aTotal;
    });

    return new Response(JSON.stringify({ data: allStats }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching posts stats:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch posts statistics" }),
      { status: 500 },
    );
  }
}
