import type React from "react";
import { useEffect, useRef, useState } from "react";

interface Props {
  path?: string;
}

// 用于首页等列表场景：默认只显示一个按钮，点击后再加载评论组件和数据，减少首屏和滚动时的请求量
const InlineComments: React.FC<Props> = ({ path }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const twikooId = path
    ? `twikoo-comments-${path.replace(/\//g, "-")}`
    : "twikoo-comments-default";

  // 加载Twikoo脚本并初始化
  useEffect(() => {
    if (!open || !containerRef.current) return;

    setLoading(true);

    // 初始化函数
    const initTwikoo = () => {
      if (typeof window.twikoo !== "undefined" && containerRef.current) {
        window.twikoo.init({
          envId: "https://twikoo-saroprock.zsxcoder.top", // 需要替换为实际的环境ID
          el: containerRef.current,
          path: path || window.location.pathname,
        });
        setLoading(false);
      } else {
        // 如果Twikoo还未加载，延迟重试
        setTimeout(initTwikoo, 100);
      }
    };

    // 检查Twikoo脚本是否已加载
    const existingScript = document.querySelector(
      'script[src*="twikoo.all.min.js"]',
    );

    if (existingScript) {
      // 如果已加载，直接初始化
      initTwikoo();
    } else {
      // 否则动态加载脚本
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdmirror.com/npm/twikoo@1.6.44/dist/twikoo.all.min.js";
      script.async = true;
      script.onload = initTwikoo;
      document.body.appendChild(script);
    }
  }, [open, path]);

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
      <div className="comments-container p-4 bg-base-200/50 border border-base-content/5 rounded-lg backdrop-blur-sm">
        {/* Twikoo评论容器 */}
        <div ref={containerRef} id={twikooId}>
          {loading && (
            <div className="text-center py-8">
              <div className="loading loading-spinner loading-lg mb-2"></div>
              <p>加载评论中...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineComments;
