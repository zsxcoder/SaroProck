import type React from "react";
import { useState } from "react";

// 用于首页等列表场景：默认只显示一个按钮，点击后再加载评论组件和数据，减少首屏和滚动时的请求量
const InlineComments: React.FC = () => {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="btn btn-xs btn-ghost gap-1 text-xs text-base-content/70"
          onClick={() => setOpen(true)}
        >
          <i className="ri-chat-3-line" />
          <span>查看评论 / 参与讨论</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* 使用 Tailwind 类名代替 style 标签 */}
      <div className="comments-container p-4 bg-base-200/50 border border-base-content/5 rounded-lg backdrop-blur-sm">
        <div className="giscus" id="giscus-comments"></div>

        {/* 移除 Astro 的 is:inline 指令，在 React 组件中不需要 */}
        {/* 使用正确的 React 属性名 crossOrigin */}
        <script
          src="https://giscus.app/client.js"
          data-repo="zsxcoder/giscus-comments"
          data-repo-id="R_kgDOQoZP0g"
          data-category="SaroProck"
          data-category-id="DIC_kwDOQoZP0s4C1JH8"
          data-mapping="pathname"
          data-strict="0"
          data-reactions-enabled="1"
          data-emit-metadata="0"
          data-input-position="top"
          data-theme="preferred_color_scheme"
          data-lang="zh-CN"
          data-loading="lazy"
          crossOrigin="anonymous"
          async
        ></script>
      </div>
    </div>
  );
};

export default InlineComments;
