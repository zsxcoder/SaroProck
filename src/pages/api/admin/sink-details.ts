import type { APIContext } from "astro";
import { getAdminUser } from "@/lib/auth";

async function proxyToSinkAPI(
  sinkUrl: string | undefined,
  sinkApiKey: string | undefined,
  event: APIContext,
) {
  if (
    !sinkApiKey ||
    !sinkUrl ||
    sinkUrl.includes("<你的") ||
    sinkApiKey.includes("<你的")
  ) {
    return new Response(
      JSON.stringify({
        error: "Sink API URL or Key is not configured.",
        message: "请在.env文件中配置SINK_PUBLIC_URL和SINK_API_KEY环境变量。",
      }),
      { status: 500 },
    );
  }

  const requestUrl = new URL(event.request.url);
  const queryParams = requestUrl.searchParams;

  const reportType = queryParams.get("report");
  const period = queryParams.get("period");
  const limit = queryParams.get("limit");

  const startDate = new Date();
  const endDate = new Date();

  if (period) {
    const days = parseInt(period.replace("last-", "").replace("d", ""), 10);
    startDate.setDate(startDate.getDate() - days);
  } else {
    startDate.setDate(startDate.getDate() - 7);
  }

  const startAt = Math.floor(startDate.getTime() / 1000);
  const endAt = Math.floor(endDate.getTime() / 1000);

  const params = new URLSearchParams();
  params.set("startAt", startAt.toString());
  params.set("endAt", endAt.toString());
  params.set("timezone", "Asia/Shanghai");

  if (reportType === "metrics") {
    const type = queryParams.get("type");
    if (type) {
      const typeMap: Record<string, string> = {
        referer: "referrer",
        country: "country",
        os: "os",
      };
      const sinkType = typeMap[type] || type;
      params.set("type", sinkType);
    }
    if (limit) {
      params.set("limit", limit);
    }
  }

  const targetUrl = new URL(sinkUrl);
  targetUrl.search = params.toString();

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: `Bearer ${sinkApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error from Sink API (${targetUrl.toString()}):`,
        errorText,
      );
      return new Response(
        JSON.stringify({
          error: `Failed to fetch from Sink API: ${response.status} ${errorText}`,
        }),
        { status: response.status },
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error proxying to Sink API:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
      }),
      { status: 500 },
    );
  }
}

export async function GET(event: APIContext): Promise<Response> {
  const adminUser = getAdminUser(event);
  if (!adminUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
    });
  }

  const sinkApiKey = import.meta.env.SINK_API_KEY;
  const sinkBaseUrl = import.meta.env.SINK_PUBLIC_URL;

  const url = new URL(event.request.url);
  const reportType = url.searchParams.get("report");

  if (!reportType) {
    return new Response(JSON.stringify({ error: "Missing report parameter" }), {
      status: 400,
    });
  }

  let sinkUrl: string | undefined;

  if (reportType === "views") {
    sinkUrl = sinkBaseUrl ? `${sinkBaseUrl}/api/stats/views` : undefined;
  } else if (reportType === "metrics") {
    sinkUrl = sinkBaseUrl ? `${sinkBaseUrl}/api/stats/analytics` : undefined;
  } else {
    return new Response(
      JSON.stringify({ error: "Invalid report type specified." }),
      { status: 400 },
    );
  }

  return proxyToSinkAPI(sinkUrl, sinkApiKey, event);
}
