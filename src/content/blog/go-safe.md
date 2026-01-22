---
title: 给博客加一个外链安全中转页（/go）
description: 记录在 Nuxt 博客里新增 /go 外链安全中转页面，并改造 Markdown 链接和友链统一通过中转跳转的过程。
pubDate: 2025-12-10 12:00:00
updatedDate: 2025-12-10 12:10:00
image: https://cdn.jsdelivr.net/gh/mcyzsx/picx-images-hosting@master/cover/go-safe.webp
tags: [教程, 博客]
categories: [技术分享]
recommend: 3
---

::alert
这篇文章来自**AI**整理！
::

> 想做一个类似 [`hexo-safego`](https://github.com/willow-god/hexo-safego) 的外链安全检测 / 中转效果，于是在自己的 Nuxt 博客里加了一个 `/go` 页面，用来统一接住外链，给用户一个“即将离开本站”的提醒和手动确认。

这篇文章记录一下整个实现过程：从需求拆解，到 `go.vue` 的实现，再到 Markdown 外链、友链卡片接入中转页，以及中途踩到的几个小坑。

## 背景 & 需求

需求最初很简单：

- 站内所有 **外链**（包括 Markdown 正文里的链接、友链页里的链接），点击时不要直接打开目标网站；
- 先跳到一个中转页 `/go?url=...`：
  - 提示“即将离开本站”；
  - 显示目标链接和域名；
  - 提供「继续访问」和「返回上一页」两个按钮；
  - 支持几秒钟的倒计时，自动跳转；
- 内部链接（例如 `/posts/...`、`/about`）保持原样，不走 `/go`。

最后确定的范围是：

- Markdown 渲染组件 `ProseA.vue`（文章正文中的链接）；
- 友链页使用的 `FriendLinkCard.vue`（`link.vue` 页面中的友链卡片）。

## 实现 `/go` 页面

首先在 `app/pages/go.vue` 新增一个页面，对应路由 `/go`。这个页面做几件事：

1. 从 query 参数里拿到原始链接 `url`；
2. 做一层解码和合法性判断；
3. 展示信息 + 倒计时；
4. 处理手动「继续访问」和「返回上一页」。

### 解析 URL 与合法性判断

```ts
<script setup lang="ts">
const route = useRoute()
const router = useRouter()

// 原始 query 参数
const rawUrl = computed(() => (route.query.url as string) || '')

// 解码后的 URL：优先 decode，失败就回退到原始字符串，保证按钮始终有值可用
const decodedUrl = computed(() => {
  if (!rawUrl.value)
    return ''
  try {
    return decodeURIComponent(rawUrl.value)
  }
  catch {
    // 如果解码失败，回退使用原始字符串，保证按钮依然可用
    return rawUrl.value
  }
})

// 检查是否是一个合法的 http/https 外链
const isValidExternal = computed(() => {
  if (!decodedUrl.value)
    return false
  try {
    const u = new URL(decodedUrl.value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  }
  catch {
    return false
  }
})

// 提取域名用于展示
const domain = computed(() => {
  if (!isValidExternal.value)
    return ''
  try {
    return new URL(decodedUrl.value).hostname
  }
  catch {
    return ''
  }
})
```
这里有一个小细节：

- 一开始如果 decodeURIComponent 失败，直接返回空字符串会导致后面一系列逻辑都认为“无效链接”，按钮会被禁用，看起来像“点不了”；

- 后来改为失败回退到 rawUrl ，只要 query 里有东西，最终就有一个可用字符串。
### 倒计时和自动跳转
```ts
const countdownSeconds = 5
const countdown = ref(countdownSeconds)
let countdownTimer: number | null = null

onMounted(() => {
  if (!isValidExternal.value)
    return

  countdown.value = countdownSeconds

  countdownTimer = window.setInterval(() => {
    if (countdown.value <= 1) {
      clearCountdown()
      proceed()
    }
    else {
      countdown.value -= 1
    }
  }, 1000)
})

onUnmounted(() => {
  clearCountdown()
})

function clearCountdown() {
  if (countdownTimer != null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}
```
设计思路：

- 只要判断为合法外链，就从设定的秒数开始倒计时；
- 每秒减 1，减到 1 时自动调用 proceed() ；
- 页面销毁（路由离开）时清理定时器，避免内存泄漏或误触发。
### 手动跳转和返回逻辑
```ts
function proceed() {
  const target = decodedUrl.value || rawUrl.value
  if (!target)
    return

  clearCountdown()
  window.location.href = target
}

function goBack() {
  clearCountdown()

  // 1. 如果是通过 window.open 打开的新标签页，优先尝试关闭自己
  if (window.opener && window.opener !== window) {
    window.close()
    return
  }

  // 2. 有历史记录就正常返回
  if (history.length > 1) {
    history.back()
    return
  }

  // 3. 没有历史时，尝试根据同源 referrer 返回
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer)
      if (ref.origin === window.location.origin) {
        router.push(ref.pathname + ref.search + ref.hash)
        return
      }
    }
    catch {
      // ignore
    }
  }

  // 4. 兜底：回首页
  router.push('/')
}
</script>
```
这里对「返回上一页」做了比较细的兼容：

- **友链卡片那种新标签页场景**：通过 window.open('/go?url=...', '_blank') 打开的 /go 页面，其实没有历史记录，这时 history.back() 是无效的，于是我们优先检测 window.opener ，直接 window.close() ，让原来的标签页停留在友链页不动；
- **同标签页场景**：有历史记录就走 history.back() ，行为和用户点浏览器后退按钮一致；
- **没有历史、没有同源 referrer 的极端场景**：最后才兜底跳首页。
### 模板和样式
模板部分主要就是展示提示、链接、按钮和倒计时：
```vue
<template>
  <div class="go-page">
    <div class="go-card">
      <h1 class="go-title">即将离开本站</h1>
      <p class="go-desc">
        你将要访问的外部链接：
      </p>
      <p v-if="isValidExternal" class="go-url">{{ decodedUrl }}</p>
      <p v-else class="go-url invalid">链接无效或缺失</p>

      <p v-if="isValidExternal" class="go-domain">
        目标站点：<strong>{{ domain }}</strong>
      </p>

      <div class="go-actions">
        <button type="button" class="btn secondary" @click="goBack">
          返回上一页
        </button>
        <button
          type="button"
          class="btn primary"
          @click="proceed"
        >
          继续访问<span v-if="domain"> {{ domain }}</span>
        </button>
      </div>

      <p v-if="isValidExternal" class="go-countdown">
        {{ countdown }} 秒后将自动跳转，如不希望跳转，请点击「返回上一页」
      </p>

      <p class="go-tip">
        外部网站内容与本博客无关，请注意辨别信息和账号安全。
      </p>
    </div>
  </div>
</template>
```
样式部分使用了博客现有的变量（ `var(--c-text)`、 `var(--ld-bg-card)` 等），整体就是一个居中的卡片，这里不赘述。

**接入 Markdown 外链：改造 `ProseA.vue`**
博客的 Markdown 链接渲染组件是 `app/components/content/ProseA.vue` ，原来大致是：

- 根据 `href` 判断是否外链；
- 用 `UtilLink` 渲染；
- 用 `v-tip` 显示域名或完整地址。

为了让 Markdown 外链走 `/go` ，改动非常小，只需要在这里统一改造 `href` 即可：
```ts
const props = defineProps<{
  href: string
  icon?: string
}>()

const icon = computed(() => props.icon || getDomainIcon(props.href))
const isExternal = computed(() => isExtLink(props.href))

// 外链统一改成指向 /go?url=encodeURIComponent(href)
const resolvedHref = computed(() => (
  isExternal.value ? `/go?url=${encodeURIComponent(props.href)}` : props.href
))

const tip = computed(() => ({
  content: isExternal.value ? getDomain(props.href) : decodeURIComponent(props.href),
  inlinePositioning: true,
}))
```
模板：
```Vue
<template>
  <UtilLink v-tip="tip" class="z-link" :to="resolvedHref">
    <Icon v-if="icon" class="domain-icon" :name="icon" />
    <slot />
  </UtilLink>
</template>
```
这样一来：

- Markdown 里写的 `https://xxx` 外链 → 页面中变成指向 `/go?url=...` 的链接；
- 内部链接（ `/about` 、 `/posts/...` ）仍然直接跳内部路由，不走 `/go` 。

**接入友链卡片**：改造 `FriendLinkCard.vue`<br>
友链页 `link.vue` 使用的是 `app/components/partial/FriendLinkCard.vue` 这张卡片。原来的跳转逻辑是直接打开站点：
```ts
function navigateToSite() {
  if (props.siteUrl) {
    window.open(props.siteUrl, '_blank')
  }
}
```
改造后统一走 `/go` ：
```ts
function navigateToSite() {
  if (!props.siteUrl)
    return

  const target = `/go?url=${encodeURIComponent(props.siteUrl)}`
  window.open(target, '_blank')
}
```
效果：

- 友链页面点“前往网站”时，不再直接打开友链，而是新开一个 `/go` 标签页；
- `/go` 负责显示提示、倒计时和跳转；
- 返回时能够区分“新开标签页”这个场景，优先关闭自己，不干扰原来的 `link.vue` 页面滚动位置。
### 一些踩坑 & 调整
在实现过程中踩了几个小坑，顺手记一下。

**1. 链接合法性校验过于严格导致按钮点不了**  
一开始「继续访问」按钮的禁用逻辑是：
```vue
<button
  :disabled="!isValidExternal"
  @click="proceed"
>
  继续访问
</button>
```
而 `isValidExternal` 是通过 `new URL(decodedUrl)` + 协议判断实现的。这样做的初衷是安全：

URL 缺失、编码错误、协议不是 http/https → 认为不安全，按钮禁用。
但实际使用时：

我们对外链统一做了 `encodeURIComponent` ；
中间一旦出现编码/解码上的处理差异， `isValidExternal` 就可能是 `false` ；
结果就是：**页面能显示链接，倒计时能自动跳转，但按钮一直是禁用状态，用户手动点不了**。
后面改成：

- `isValidExternal` 只用于显示信息（例如显示域名、显示“链接无效或缺失”）；
- 按钮本身不再绑定禁用条件，始终可点，真正的兜底放在`proceed()`里：
```ts
function proceed() {
  const target = decodedUrl.value || rawUrl.value
  if (!target)
    return

  clearCountdown()
  window.location.href = target
}
```
这样既保留了一定的安全感知，又不至于影响正常访问。

**2. 返回上一页导致滚动位置混乱**  
友链卡片是通过 `window.open` 新开 `/go` 标签页的，但 `/go` 一开始是这么写的：
```ts
function goBack() {
  if (history.length > 1)
    history.back()
  else
    router.push('/')
}
```
新标签页基本没有历史，所以会直接 `router.push('/')` 跳首页。视觉体验就是：

- 你明明是从 `link.vue` 底部的友链区域点过来的；
- 点了「返回上一页」却去了首页，原来的页面滚动位置也被重置，看起来像是“底部组件跑到顶部”。

重写后的 `goBack` 逻辑就解决了这个体验问题：

- 新标签页优先 `window.close()` ；
- 同标签页用 `history.back()` ；
- 实在没有历史才兜底根据 `document.referrer` / 首页处理。


### 总结
通过这次改造，博客里所有指定范围的外链都统一走了 `/go` 中转页，达到了类似 hexo-safego 的效果：

- 用户在点击外链前会看到明确的提示；
- 可以手动选择继续访问或返回；
- 也支持倒计时自动跳转；
- Markdown 正文和友链页都接入了这套逻辑。

整体实现成本并不高，但能明显提升外链安全感知和交互体验。如果以后需要更严格的策略（例如只允许白名单域名、记录访问日志等），也可以在 `/go` 这个集中入口上继续扩展。