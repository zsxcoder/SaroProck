import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";

export async function GET(context: APIContext): Promise<Response> {
  const adminUser = getAdminUser(context);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const sinkBaseUrl = import.meta.env.SINK_PUBLIC_URL;
  const sinkApiKey = import.meta.env.SINK_API_KEY;

  let totalSinkViews = 0;

  if (sinkApiKey && sinkBaseUrl) {
    const sinkCountersUrl = `${sinkBaseUrl}/api/stats/counters`;

    try {
      const sinkCountersResponse = await fetch(sinkCountersUrl, {
        headers: {
          Authorization: `Bearer ${sinkApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (sinkCountersResponse.ok) {
        const countersData = await sinkCountersResponse.json();
        if (countersData.data?.[0]) {
          totalSinkViews = countersData.data[0].visits || 0;
        }
      } else {
        console.error(
          "Failed to fetch Sink counters:",
          sinkCountersResponse.status,
        );
      }
    } catch (error) {
      console.error("Error fetching Sink counters:", error);
    }
  }

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
}
