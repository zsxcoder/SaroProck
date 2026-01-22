// 滚动文字动画
document.addEventListener("DOMContentLoaded", () => {
  // 找到所有的mask元素
  const maskContainer = document.querySelector(".mask");
  if (!maskContainer) return;

  const spans = maskContainer.querySelectorAll("span");
  if (spans.length !== 4) return;

  // 设置初始状态
  spans[0].setAttribute("data-up", "");
  spans[3].setAttribute("data-show", "");

  let currentIndex = 0;

  // 启动滚动动画
  setInterval(() => {
    // 移除所有状态
    spans.forEach((span) => {
      span.removeAttribute("data-up");
      span.removeAttribute("data-show");
    });

    // 计算当前显示的元素索引
    const showIndex = (currentIndex + 3) % 4;
    // 计算要上移的元素索引
    const upIndex = currentIndex;

    // 设置新状态
    spans[showIndex].setAttribute("data-show", "");
    spans[upIndex].setAttribute("data-up", "");

    // 更新当前索引
    currentIndex = (currentIndex + 1) % 4;
  }, 2000);
});
