import type React from "react";

const CommentsManager: React.FC = () => {
  return (
    <div className="bg-base-200/60 backdrop-blur-xl rounded-2xl p-6 border border-base-content/10 shadow-lg">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <i className="ri-chat-3-line text-xl" /> 评论管理
      </h2>

      <div className="bg-base-100/80 rounded-xl p-8 border border-primary/30">
        <div className="flex flex-col items-center text-center">
          <i className="ri-information-line text-4xl text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Twikoo 评论管理</h3>
          <p className="text-base-content/70 mb-6">
            博客已使用 Twikoo 评论系统，评论管理功能由 Twikoo 提供。
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <i className="ri-check-circle-line text-success" />
              <span className="text-base-content/80">
                Twikoo 提供了完整的评论管理功能
              </span>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-check-circle-line text-success" />
              <span className="text-base-content/80">
                支持评论审核、删除、回复等功能
              </span>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-check-circle-line text-success" />
              <span className="text-base-content/80">提供了直观的管理界面</span>
            </div>
          </div>
          <div className="mt-8">
            <p className="text-base-content/60 text-sm">
              请使用 Twikoo 提供的管理界面来管理评论。 你可以在 Twikoo
              配置中设置管理密码，然后通过访问评论区的管理入口进入管理界面。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsManager;
