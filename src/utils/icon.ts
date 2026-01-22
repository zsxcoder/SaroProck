/** 主域名图标映射 */
// @keep-sorted
const mainDomainIcons: Record<string, string> = {
  "bilibili.com": "lucide:video",
  "creativecommons.org": "lucide:copyright",
  "github.com": "lucide:github",
  "github.io": "lucide:github",
  "google.cn": "lucide:globe",
  "google.com": "lucide:globe",
  "microsoft.com": "lucide:window",
  "netlify.app": "lucide:cloud",
  "pages.dev": "lucide:cloud",
  "qq.com": "lucide:message-circle",
  "thisis.host": "lucide:star",
  "v2ex.com": "lucide:link",
  "vercel.app": "lucide:cloud",
  "zabaur.app": "lucide:link",
  "zhihu.com": "lucide:message-circle",
  "astro.build": "lucide:zap",
  "vuejs.org": "lucide:link",
  "react.dev": "lucide:link",
  "youtube.com": "lucide:video",
  "stackoverflow.com": "lucide:code",
  "npmjs.com": "lucide:package",
};

/** 专门域名图标映射，优先级高于主域名图标 */
// @keep-sorted
export const domainIcons: Record<string, string> = {
  "developer.mozilla.org": "lucide:file-code",
  "mp.weixin.qq.com": "lucide:message-circle",
  "twitter.com": "lucide:twitter",
  "x.com": "lucide:twitter",
  "facebook.com": "lucide:facebook",
  "instagram.com": "lucide:image",
  "youtube.com": "lucide:video",
};

/**
 * 获取URL的域名
 * @param url URL地址
 * @returns 域名
 */
export function getDomain(url: string): string {
  try {
    const { hostname } = new URL(url);
    return hostname;
  } catch {
    return "";
  }
}

/**
 * 获取URL的主域名
 * @param url URL地址
 * @param includeTld 是否包含顶级域名
 * @returns 主域名
 */
export function getMainDomain(url: string, includeTld = false): string {
  try {
    const { hostname } = new URL(url);
    const parts = hostname.split(".");
    if (parts.length <= 2) {
      return hostname;
    }
    if (includeTld) {
      return parts.slice(-2).join(".");
    }
    return parts.slice(-3).join(".");
  } catch {
    return "";
  }
}

/**
 * 判断是否为外部链接
 * @param url URL地址
 * @returns 是否为外部链接
 */
export function isExtLink(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const currentHost =
      import.meta.env.SITE?.split("://")[1].split("/")[0] || "";
    return hostname !== currentHost;
  } catch {
    return url.startsWith("http");
  }
}

/**
 * 安全解码URI组件
 * @param uri URI组件
 * @returns 解码后的字符串
 */
export function safelyDecodeUriComponent(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
}

/**
 * 根据URL获取域名图标
 * @param url URL地址
 * @returns 图标名称
 */
export function getDomainIcon(url: string): string {
  const domain = getDomain(url);
  const mainDomain = getMainDomain(url, true);
  if (domain in domainIcons) {
    return domainIcons[domain];
  }
  return mainDomainIcons[mainDomain] || "";
}
