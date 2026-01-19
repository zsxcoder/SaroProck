import type React from "react";
import { useEffect, useRef, useState } from "react";

// 用于首页等列表场景：默认只显示一个按钮，点击后再加载评论组件和数据，减少首屏和滚动时的请求量
const InlineComments: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [uniqueId, setUniqueId] = useState<string>("");
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // 生成唯一id
  useEffect(() => {
    // 使用slice代替已废弃的substr方法
    setUniqueId(`giscus-comments-${Math.random().toString(36).slice(2, 11)}`);
  }, []);

  // 动态加载Giscus脚本，确保每个评论框都能正确初始化
  useEffect(() => {
    if (open && uniqueId && !scriptRef.current) {
      const script = document.createElement("script");
      script.src = "https://giscus.app/client.js";
      script.setAttribute("data-repo", "zsxcoder/giscus-comments");
      script.setAttribute("data-repo-id", "R_kgDOQoZP0g");
      script.setAttribute("data-category", "SaroProck");
      script.setAttribute("data-category-id", "DIC_kwDOQoZP0s4C1JH8");
      script.setAttribute("data-mapping", "pathname");
      script.setAttribute("data-strict", "0");
      script.setAttribute("data-reactions-enabled", "1");
      script.setAttribute("data-emit-metadata", "0");
      script.setAttribute("data-input-position", "top");
      script.setAttribute("data-theme", "preferred_color_scheme");
      script.setAttribute("data-lang", "zh-CN");
      script.setAttribute("data-loading", "lazy");
      script.setAttribute("crossOrigin", "anonymous");
      script.async = true;

      // 将脚本添加到当前组件的评论容器中
      const container = document.getElementById(uniqueId);
      if (container) {
        container.appendChild(script);
        scriptRef.current = script;
      }
    }

    return () => {
      // 清理脚本，避免内存泄漏
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
    };
  }, [open, uniqueId]);

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
        {/* 使用唯一id */}
        <div className="giscus" id={uniqueId}></div>
      </div>
    </div>
  );
};

export default InlineComments;
