// ==UserScript==
// @name         话题页自动刷新 + 话题新标签打开+表情包盒子
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  从其它页面跳转到话题首页 /t/topic/786046 才刷新一次；避免滚动分页误触发；并让所有话题链接在新标签打开
// @author       banlan
// @match        https://linux.do/*
// @match        https://www.nodeloc.com/*
// @match        https://idcflare.com/*
// @match        *://*/*/t/topic/*
// @icon         https://linux.do/uploads/default/optimized/4X/0/7/5/075f92ecdc0a553e05e73c0ef97e5b48e99d57bd_2_750x750.png
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';
// === 配置区 === 刷新话题页
const AUTO_REFRESH_ENABLED = true;

const EXCLUSIONS = new Set([
  '/t/topic/641579',
  '/t/topic/757622',
  '/t/topic/44341'
]);

const allowedSites = [
  //"www.nodeloc.com",
  //"linux.do",
];

// === 核心逻辑 ===

// 匹配话题页：/t/topic/{id} 或 /t/topic/{id}/{floor}
const isTopicPage = (path) =>
  /^\/t\/topic\/\d+(?:\/\d+)?\/?$/.test(path) &&
  !EXCLUSIONS.has(path.replace(/\/\d+\/?$/, '').replace(/\/$/, ''));

function isAllowedSite(hostname) {
  return allowedSites.includes(hostname);
}

if (window.__didAutoRefresh) return;

const refreshOnce = (path) => {
  if (!AUTO_REFRESH_ENABLED) return;

  // 取话题基础路径，例如 /t/topic/123
  const baseTopicPath = path.replace(/\/\d+\/?$/, '').replace(/\/$/, '');
  const key = 'refreshed_' + baseTopicPath;

  if (sessionStorage.getItem(key)) return;

  sessionStorage.setItem(key, 'true');
  window.__didAutoRefresh = true;
  console.log('[auto-refresh] refreshing topic page:', baseTopicPath);

  setTimeout(() => {
    if (location.pathname.startsWith(baseTopicPath)) {
      location.reload();
    }
  }, 100);
};

// 初始进入时
if (isAllowedSite(location.hostname) && isTopicPage(location.pathname)) {
  refreshOnce(location.pathname);
}

// === 点击拦截逻辑 ===
document.addEventListener("click", (e) => {
  let a = e.target.closest("a");
  if (!a) return;

  try {
    let url = new URL(a.href, location.origin);

    // 如果点击的链接是当前页面链接，直接跳过，不刷新
    if (url.pathname === location.pathname && url.hostname === location.hostname) {
      return;
    }

    if (isAllowedSite(url.hostname) && isTopicPage(url.pathname)) {
      // 阻止默认跳转，手动 replace 跳转（不会增加历史记录）
      e.preventDefault();
      refreshOnce(url.pathname);
      location.replace(url.href); // ✅ 不会增加历史记录
    }
  } catch (err) {
    console.warn("Invalid link", err);
  }
});







//-------------------------------------------------------------------//
    // ---- 新增：拦截话题点击，在（点击楼层回复和标题除外）新标签打开 ----
document.addEventListener('click', function (e) {
  // 只处理左键普通点击
  if (e.defaultPrevented) return;
  if (e.button !== 0) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const a = e.target.closest('a[href]');
  if (!a) return;

  const href = a.href;
  const currentHost = location.hostname;
  const isSameOrigin = a.hostname === currentHost;

  // 只处理白名单域名
  const allowedDomains = [
    'linux.do', 
    'clochat.com', 
    'idcflare.com',
    'www.nodeloc.com'
    ];
  if (!isSameOrigin || !allowedDomains.includes(currentHost)) return;

  // 当前话题页 & 点击的还是同一话题 -> 放行
  const currentTopicMatch = location.pathname.match(/^\/t\/topic\/(\d+)(?:\/\d+)?$/);
  const clickedTopicMatch = a.pathname.match(/^\/t\/topic\/(\d+)(?:\/(\d+))?$/);
  if (a.closest('h1') && currentTopicMatch && clickedTopicMatch && currentTopicMatch[1] === clickedTopicMatch[1]) return;
  if (currentTopicMatch && clickedTopicMatch && currentTopicMatch[1] === clickedTopicMatch[1]) return;

  // 需要强制新标签打开的路径
  const openInNewTabPatterns = [
    /^\/t\/topic\/\d+(\/\d+)?(\?.*)?$/,
    /^\/faq$/,
    /^\/leaderboard$/,
    /^\/tags$/,
    /^\/about$/,
    /^\/top$/,
  ];

  if (openInNewTabPatterns.some(p => p.test(a.pathname))) {
    // 关键三连：阻止一切默认和冒泡
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // 显式设置属性，避免浏览器默认行为混淆
    a.target = '_blank';
    a.rel = 'noopener noreferrer';

    // 打开新标签
    window.open(href, '_blank', 'noopener');
  }
}, true);  // 捕获阶段


//-------------------------------------------------------------------//
    // ---- 新增：返回顶部按钮 ----
    function addBackToTop() {
        const btn = document.createElement('div');
        btn.innerText = '↑ 顶部';
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '75px',
            right: '30px',
            background: '#007aff',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            zIndex: 9999,
            opacity: 0,
            transition: 'opacity 0.3s',
        });
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 200) {
                btn.style.opacity = 1;
            } else {
                btn.style.opacity = 0;
            }
        });
    }

    // 等待 DOM 就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBackToTop);
    } else {
        addBackToTop();
    }


// 更稳健的楼层标记：支持 topic-owner / 从中间楼层进入 + localStorage 缓存
if (window.top !== window) {
  // 避免在 iframe 中执行
} else {
  const style = document.createElement('style');
  style.textContent = `
    .tm-floor-label {
      display: inline-block;
      margin-left: 6px;
      font-size: 12px;
      color: #888;
      line-height: 1;
      vertical-align: middle;
      pointer-events: none;
    }
    .tm-floor-label.tm-op {
      color: #fff;
      background: rgba(0,0,0,0.6);
      padding: 2px 6px;
      border-radius: 3px;
    }
  `;
  document.head.appendChild(style);

  let OP_NAME = null;
  let pendingPosts = new Set();
  let debounceTimer = null;
  const DEBOUNCE_MS = 60;
  let observer = null;

  // ---------------- 缓存相关 ----------------
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h
  function getTopicId() {
    const m = window.location.pathname.match(/\/t\/[^/]+\/(\d+)/);
    return m ? m[1] : null;
  }

  function loadCachedOP() {
    try {
      const topicId = getTopicId();
      if (!topicId) return null;
      const raw = localStorage.getItem("topic-op-" + topicId);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > CACHE_TTL) {
        localStorage.removeItem("topic-op-" + topicId);
        return null;
      }
      return data.username; // 只返回 username 用于判断
    } catch (e) {
      return null;
    }
  }

  function saveCachedOP(username, fullname = null) {
    try {
      const topicId = getTopicId();
      if (!topicId) return;
      const data = { username, fullname, ts: Date.now() };
      localStorage.setItem("topic-op-" + topicId, JSON.stringify(data));
    } catch (e) {}
  }

  // ---------------- 获取用户名 ----------------
  function getUserCardName(post) {
    try {
      const a = post.querySelector('.topic-meta-data a[data-user-card]');
      if (a) {
        const cardUser = a.getAttribute('data-user-card');
        if (cardUser && cardUser.trim()) {
          return cardUser.trim();
        }
      }
      const fallback = post.getAttribute('data-user-card');
      return fallback ? fallback.trim() : '';
    } catch (e) {
      return '';
    }
  }

  function getAnchorForPost(post) {
    return (
      post.querySelector('.post-info.post-date') ||
      post.querySelector('.topic-meta-data .post-info') ||
      post.querySelector('.topic-meta-data') ||
      null
    );
  }

  function makeLabelText(isOP, floor) {
    return isOP ? (floor === 1 ? '楼主' : `楼主 · ${floor} 楼`) : `${floor} 楼`;
  }

  // ---------------- 更稳健的获取楼主用户名（支持 fullname） ----------------
  async function fetchOPInfoFromFirstPost() {
    try {
      const url = new URL(window.location.href);
      const parts = url.pathname.split('/');
      if (/^\d+$/.test(parts[parts.length - 1])) {
        parts[parts.length - 1] = '1';
      } else {
        parts.push('1');
      }
      const firstUrl = url.origin + parts.join('/');

      const resp = await fetch(firstUrl, { credentials: 'include' });
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const firstPost = doc.querySelector('.topic-post[data-post-number="1"]');
      if (firstPost) {
        const a = firstPost.querySelector('.topic-meta-data a[data-user-card]');
        const username = a?.getAttribute('data-user-card')?.trim() || null;

        // full name
        let fullname = null;
        const fullSpan = firstPost.querySelector('.topic-meta-data .full-name');
        if (fullSpan) {
          fullname = fullSpan.textContent.trim();
        } else if (a?.getAttribute('title')) {
          fullname = a.getAttribute('title').trim();
        }

        return { username, fullname };
      }
    } catch (e) {
      console.error('fetchOPInfoFromFirstPost error:', e);
    }
    return { username: null, fullname: null };
  }

  // ---------------- topic-owner 兜底 ----------------
  function hasNonEmptyPseudoContent(el, pseudo) {
    try {
      const cs = window.getComputedStyle(el, pseudo);
      if (!cs) return false;
      let content = cs.getPropertyValue('content');
      if (!content) return false;
      content = content.trim();
      if (content === 'none' || content === 'normal') return false;
      const stripped = content.replace(/^['"]|['"]$/g, '').trim();
      return stripped.length > 0;
    } catch (e) {
      return false;
    }
  }

  function isPostTopicOwner(post) {
    try {
      if (post.classList && post.classList.contains('topic-owner')) return true;
      if (post.closest && post.closest('.topic-owner')) return true;

      const candidates = [
        post.querySelector('.topic-body .contents > .cooked'),
        post.querySelector('.cooked'),
        post.querySelector('.topic-meta-data .cooked'),
        post.querySelector('.topic-meta-data'),
      ];
      for (const el of candidates) {
        if (!el) continue;
        if (hasNonEmptyPseudoContent(el, '::after')) return true;
        if (hasNonEmptyPseudoContent(el, '::before')) return true;
      }
    } catch (e) {}
    return false;
  }

  // ---------------- 处理楼层 ----------------
  function processBatch(posts) {
    if (!posts || posts.length === 0) return false;

    for (const post of posts) {
      try {
        if (!post || post.nodeType !== 1) continue;
        const numStr = post.getAttribute && post.getAttribute('data-post-number');
        const floor = numStr ? parseInt(numStr, 10) : NaN;
        if (!floor && floor !== 0) continue;

        const anchor = getAnchorForPost(post);
        if (!anchor) continue;

        const curUser = getUserCardName(post);

        const isOP =
          (!!OP_NAME && curUser === OP_NAME) ||
          isPostTopicOwner(post);

        let label = null;
        try {
          label = anchor.querySelector(':scope > .tm-floor-label');
        } catch (e) {
          for (const ch of Array.from(anchor.children || [])) {
            if (ch.classList && ch.classList.contains('tm-floor-label')) {
              label = ch;
              break;
            }
          }
        }

        const desiredText = makeLabelText(isOP, floor);

        if (!label) {
          label = document.createElement('span');
          label.className = 'tm-floor-label' + (isOP ? ' tm-op' : '');
          label.textContent = desiredText;
          anchor.appendChild(label);
        } else {
          if (label.textContent !== desiredText) {
            label.textContent = desiredText;
          }
          if (isOP) {
            if (!label.classList.contains('tm-op')) label.classList.add('tm-op');
          } else {
            if (label.classList.contains('tm-op')) label.classList.remove('tm-op');
          }
        }
      } catch (err) {
        console.error('processBatch post error:', err);
      }
    }
  }

  function doProcessPosts(posts) {
    if (!posts || posts.length === 0) return;
    if (observer) observer.disconnect();
    processBatch(posts);
    if (observer) observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---------------- 初始化 ----------------
  async function initAll() {
    const topicId = getTopicId();
    if (!topicId) return;

    // 优先从缓存中读取
    if (!OP_NAME) {
      const cached = loadCachedOP();
      if (cached) {
        OP_NAME = cached;
        console.log('✅ 从缓存找到楼主用户名：', OP_NAME);
      }
    }

    // 若缓存未命中，尝试从第一页获取
    if (!OP_NAME) {
      const { username, fullname } = await fetchOPInfoFromFirstPost();
      if (username) {
        OP_NAME = username;
        saveCachedOP(OP_NAME, fullname);
        console.log('✅ 成功找到楼主用户名并缓存：', OP_NAME);
        if (fullname) console.log('ℹ️ 楼主全名：', fullname);
      } else {
        console.warn('⚠ 未能从 /1 获取楼主信息，尝试伪元素兜底…');
        const el = document.querySelector('.topic-owner');
        if (el) {
          const content = window.getComputedStyle(el, '::after').content;
          if (content && content !== 'none' && content !== '""') {
            const a = el.querySelector('a[data-user-card]');
            if (a) {
              OP_NAME = a.getAttribute('data-user-card')?.trim() || null;
              console.log('✅ 兜底从伪元素检测到楼主用户名：', OP_NAME);
            }
          }
        }
      }
    }

    const all = Array.from(document.querySelectorAll('.topic-post[data-post-number]'));
    if (all.length) {
      doProcessPosts(all);
    }
  }

  // ---------------- MutationObserver ----------------
  function onMutations(mutations) {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (!n || n.nodeType !== 1) continue;
          try {
            if (n.matches && n.matches('.topic-post')) {
              pendingPosts.add(n);
            } else if (n.querySelectorAll) {
              const inner = n.querySelectorAll('.topic-post');
              if (inner && inner.length) inner.forEach(p => pendingPosts.add(p));
            }
          } catch (e) {}
        }
      }
      try {
        if (m.target && m.target.closest) {
          const p = m.target.closest('.topic-post');
          if (p) pendingPosts.add(p);
        }
      } catch (e) {}
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const posts = Array.from(pendingPosts);
      pendingPosts.clear();
      if (posts.length) doProcessPosts(posts);
    }, DEBOUNCE_MS);
  }

  observer = new MutationObserver(onMutations);
  observer.observe(document.body, { childList: true, subtree: true });

  try {
    initAll();
  } catch (e) {
    console.error('initAll error', e);
  }
}





//楼层显示2     .topic-post:not(:first-child):before {
if (window.top !== window) {
        return;
    }

    const styles = `
    .topic-post {
        position: relative;
    }

    .topic-post:before {
        position: absolute;
        top: 0;
        right: calc(100% - 1px);
        font-size: 13px;
        min-width: var(--d-main-content-gap);
        height: 2em;
        line-height: 2em;
        text-align: center;
        color: var(--primary-medium);
        border: 1px solid var(--content-border-color);
        content: attr(data-post-number) !important;
    }
    `

    if ('GM_addStyle' in window) {
        GM_addStyle(styles);
    } else if ('GM' in window) {
        GM.addStyle(styles);
    } else {
        const style = document.createElement('style');
        style.textContent = styles;
        document.head.appendChild(style);
    }



  //表情包
    const STORAGE_KEY_V1 = "emojiLinksList";
    const STORAGE_KEY_V2 = "emojiLinksListV2"; // 新版本，分类存储

    let emojiData = {}; // {分类名: [url1, url2]}
    let currentCategory = "默认";
    let deleteMode = false;

    async function loadEmojiData() {
        // 先尝试加载新版本
        const storedV2 = await GM_getValue(STORAGE_KEY_V2, null);
        if (storedV2) {
            try {
                emojiData = JSON.parse(storedV2);
                return;
            } catch (e) {
                emojiData = {};
            }
        }

        // 如果没有新版本数据，尝试旧版本迁移
        const storedV1 = await GM_getValue(STORAGE_KEY_V1, "[]");
        try {
            const oldList = JSON.parse(storedV1);
            if (Array.isArray(oldList)) {
                emojiData["默认"] = oldList;
                await saveEmojiData();
            } else {
                emojiData["默认"] = [];
            }
        } catch {
            emojiData["默认"] = [];
        }
    }

    async function saveEmojiData() {
        await GM_setValue(STORAGE_KEY_V2, JSON.stringify(emojiData));
    }

    function createButton(text, onClick) {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.style.margin = "5px 5px 10px 0";
        btn.style.padding = "5px 10px";
        btn.style.fontSize = "12px";
        btn.style.cursor = "pointer";
        btn.onclick = onClick;
        return btn;
    }

    // 主按钮
    const mainBtn = document.createElement("div");
    mainBtn.innerText = "🐤 表情包";
    Object.assign(mainBtn.style, {
        position: "fixed",
        bottom: "74px",
        right: "100px",
        background: "#ffc107",
        color: "#000",
        padding: "10px 15px",
        borderRadius: "12px",
        boxShadow: "0 0 5px rgba(0,0,0,0.2)",
        zIndex: "9999",
        cursor: "pointer",
        fontSize: "14px",
        userSelect: "none"
    });

    // 面板
    const panel = document.createElement("div");
    Object.assign(panel.style, {
        position: "fixed",
        bottom: "150px",
        right: "30px",
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: "10px",
        padding: "10px",
        width: "320px",
        maxHeight: "450px",
        overflowY: "auto",
        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        zIndex: "9999",
        display: "none"
    });

    // 分类选择器
    const categorySelect = document.createElement("select");
    categorySelect.style.marginBottom = "10px";
    categorySelect.style.width = "100%";
    categorySelect.style.fontSize = "12px";

    function refreshCategoryOptions() {
        categorySelect.innerHTML = "";
        Object.keys(emojiData).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if (cat === currentCategory) opt.selected = true;
            categorySelect.appendChild(opt);
        });
    }

    categorySelect.addEventListener("change", () => {
        currentCategory = categorySelect.value;
        refreshPanel();
    });
    panel.appendChild(categorySelect);

    // 新分类按钮
    const addCategoryBtn = createButton("➕ 新分类", async () => {
        const name = prompt("输入新分类名称：")?.trim();
        if (name && !emojiData[name]) {
            emojiData[name] = [];
            currentCategory = name;
            await saveEmojiData();
            refreshCategoryOptions();
            refreshPanel();
        }
    });
    panel.appendChild(addCategoryBtn);

    // 输入框
    const input = document.createElement("textarea");
    input.placeholder = "支持多行添加图片链接（每行一个）";
    Object.assign(input.style, {
        width: "100%",
        height: "60px",
        marginBottom: "10px",
        padding: "5px",
        resize: "vertical",
        fontSize: "12px"
    });
    panel.appendChild(input);

    // 按钮区
    // const addBtn = createButton("添加图片", async () => {
    //     const lines = input.value.trim().split("\n").map(line => line.trim()).filter(line => line.startsWith("http"));
    //     if (lines.length > 0) {
    //     if (!emojiData[currentCategory]) emojiData[currentCategory] = [];

    //     // 获取所有分类的所有链接（扁平化）
    //     const allUrls = Object.values(emojiData).flat();

    //     let addedCount = 0;
    //     lines.forEach(url => {
    //         if (!allUrls.includes(url)) {
    //             emojiData[currentCategory].push(url);
    //             allUrls.push(url); // 同步更新全局列表
    //             addedCount++;
    //         }
    //     });

    //     if (addedCount > 0) {
    //         await saveEmojiData();
    //         refreshPanel();
    //     }

    //     input.value = "";
    //     if (addedCount === 0) {
    //         alert("这些链接已存在于其他分类或当前分类，无需添加。");
    //     } else if (addedCount < lines.length) {
    //         alert(`已添加 ${addedCount} 个，跳过 ${lines.length - addedCount} 个重复。`);
    //     }
    // }
    // });
    const addBtn = createButton("添加图片", async () => {
    let lines = input.value.trim().split("\n").map(line => line.trim()).filter(line => line.length > 0);

    // 正则表达式用于匹配 Markdown 格式的图片链接
    const markdownRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/;

    // 提取 Markdown 格式中的链接
    let extractedLinks = [];
    lines.forEach(line => {
        // 如果是 Markdown 格式链接，提取其中的 https 链接
        const match = line.match(markdownRegex);
        if (match) {
            extractedLinks.push(match[1]);
        } else if (line.startsWith("http")) {
            // 否则直接当作 http 链接
            extractedLinks.push(line);
        }
    });

    if (extractedLinks.length > 0) {
        if (!emojiData[currentCategory]) emojiData[currentCategory] = [];

        // 获取所有分类的所有链接（扁平化）
        const allUrls = Object.values(emojiData).flat();

        let addedCount = 0;
        extractedLinks.forEach(url => {
            if (!allUrls.includes(url)) {
                emojiData[currentCategory].push(url);
                allUrls.push(url); // 同步更新全局列表
                addedCount++;
            }
        });

        if (addedCount > 0) {
            await saveEmojiData();
            refreshPanel();
        }

        input.value = "";
        if (addedCount === 0) {
            alert("这些链接已存在于其他分类或当前分类，无需添加。");
        } else if (addedCount < extractedLinks.length) {
            alert(`已添加 ${addedCount} 个，跳过 ${extractedLinks.length - addedCount} 个重复。`);
        }
    }
});


    const clearBtn = createButton("清空全部", async () => {
        if (confirm(`确定要清空分类【${currentCategory}】的所有图片？`)) {
            emojiData[currentCategory] = [];
            await saveEmojiData();
            refreshPanel();
        }
    });

    const toggleDeleteBtn = createButton("删除模式：关闭", () => {
        deleteMode = !deleteMode;
        toggleDeleteBtn.textContent = deleteMode ? "删除模式：开启" : "删除模式：关闭";
        refreshPanel();
    });

    const exportBtn = createButton("导出表情包链接", () => {
        const list = emojiData[currentCategory] || [];
        if (list.length === 0) {
            alert("当前分类没有任何表情包链接。");
            return;
        }
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: "10000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
        });

        const dialog = document.createElement("div");
        Object.assign(dialog.style, {
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0,0,0,0.3)",
            maxWidth: "90%",
            width: "420px",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch"
        });

        const textarea = document.createElement("textarea");
        textarea.value = list.join("\n");
        textarea.readOnly = true;
        Object.assign(textarea.style, {
            width: "100%",
            height: "200px",
            fontSize: "12px",
            padding: "10px",
            resize: "none",
            marginBottom: "10px",
            whiteSpace: "pre"
        });

        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "flex-end";
        buttonRow.style.gap = "10px";

        const copyBtn = document.createElement("button");
        copyBtn.textContent = "复制全部";
        copyBtn.onclick = () => {
            textarea.select();
            document.execCommand("copy");
            copyBtn.textContent = "✅ 已复制";
            setTimeout(() => (copyBtn.textContent = "复制全部"), 2000);
        };

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "关闭";
        closeBtn.onclick = () => document.body.removeChild(overlay);

        buttonRow.appendChild(copyBtn);
        buttonRow.appendChild(closeBtn);

        dialog.appendChild(textarea);
        dialog.appendChild(buttonRow);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        textarea.select();
    });

    const topButtons = document.createElement("div");
    topButtons.appendChild(addBtn);
    topButtons.appendChild(clearBtn);
    topButtons.appendChild(toggleDeleteBtn);
    topButtons.appendChild(exportBtn);
    panel.appendChild(topButtons);

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    panel.appendChild(container);

    function refreshPanel() {
        refreshCategoryOptions();
        container.innerHTML = "";
        const list = emojiData[currentCategory] || [];
        list.forEach((url, index) => {
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.margin = "5px";

            const img = document.createElement("img");
            img.src = url;
            img.title = "点击复制 Markdown";
            Object.assign(img.style, {
                width: "60px",
                height: "60px",
                objectFit: "contain",
                cursor: "pointer",
                border: "1px solid #ddd",
                borderRadius: "5px"
            });

            img.onclick = async () => {
                const markdown = `![image|100x100](${url})\n`;
                const tryInsert = () => {
                    const cmWrapper = document.querySelector('#cm-editor-wrapper .CodeMirror');
                    if (cmWrapper && cmWrapper.CodeMirror) {
                        const cm = cmWrapper.CodeMirror;
                        const doc = cm.getDoc();
                        const cursor = doc.getCursor();
                        doc.replaceRange(markdown, cursor);
                        cm.focus();
                        return true;
                    }
                    const textarea = document.querySelector(".d-editor-input");
                    if (textarea) {
                        textarea.value += markdown;
                        textarea.dispatchEvent(new Event("input", { bubbles: true }));
                        textarea.focus();
                        return true;
                    }
                    return false;
                };
                if (tryInsert()) return;
                const replyBtn = document.querySelector("button.btn-primary");
                if (replyBtn) replyBtn.click();
                let tries = 0;
                const interval = setInterval(() => {
                    if (tryInsert()) {
                        clearInterval(interval);
                    } else if (++tries >= 5) {
                        clearInterval(interval);
                        alert("未找到编辑器输入框，请先进入编辑模式。");
                    }
                }, 300);
            };

            if (deleteMode) {
                const delBtn = document.createElement("div");
                delBtn.innerText = "✕";
                Object.assign(delBtn.style, {
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#f00",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "12px",
                    textAlign: "center",
                    lineHeight: "18px",
                    cursor: "pointer"
                });
                delBtn.onclick = async (e) => {
                    e.stopPropagation();
                    list.splice(index, 1);
                    await saveEmojiData();
                    refreshPanel();
                };
                wrapper.appendChild(delBtn);
            }

            wrapper.appendChild(img);
            container.appendChild(wrapper);
        });
    }

    // mainBtn.addEventListener("click", () => {
    //     panel.style.display = panel.style.display === "none" ? "block" : "none";
    // });

    // (async function init() {
    //     await loadEmojiData();
    //     refreshPanel();
    //     document.body.appendChild(mainBtn);
    //     document.body.appendChild(panel);
    // })();


// ========== 新增：编辑器按钮逻辑 ==========
// ========== 面板关闭统一方法 ==========
function closePanel() {
    if (panel && panel.style.display !== "none") {
        panel.style.display = "none";
    }
}

// ========== 编辑器按钮逻辑 ==========
function insertEmojiButton(onClick) {
    const toolbar = document.querySelector('.d-editor-button-bar[role="toolbar"]');
    if (!toolbar) return;
    if (document.querySelector('.nacho-emoji-picker-button')) return;

    const emojiButton = document.createElement('button');
    emojiButton.classList.add('btn', 'no-text', 'btn-icon', 'toolbar__button', 'nacho-emoji-picker-button');
    emojiButton.title = "自定义表情";
    emojiButton.type = "button";
    emojiButton.innerHTML = `🐈‍⬛`;

    toolbar.appendChild(emojiButton);

    if (typeof onClick === 'function') {
        emojiButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止冒泡关闭
            onClick();
        });
    }
}

// 监听编辑器显示/隐藏，自动关闭面板
function observeEditorClose() {
    const composer = document.querySelector(".composer, .composer-popup");
    if (!composer) return;

    const observer = new MutationObserver(() => {
        const hidden = composer.style.display === "none" || composer.hidden || composer.classList.contains("hidden");
        if (hidden) closePanel();
    });

    observer.observe(composer, {
        attributes: true,
        attributeFilter: ["style", "class", "hidden"]
    });
}

// 监听 toolbar 动态生成按钮
function observeEditorToolbar() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };

    const callback = function(mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
                const toolbar = document.querySelector('.d-editor-button-bar[role="toolbar"]');
                if (toolbar && !document.querySelector('.nacho-emoji-picker-button')) {
                    insertEmojiButton(() => {
                        panel.style.display = panel.style.display === "none" ? "block" : "none";
                    });
                }
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

// 阻止面板内部点击关闭
panel.addEventListener("click", (e) => e.stopPropagation());

// 点击页面其他地方关闭面板
document.addEventListener("click", () => closePanel());

// ========== 初始化 ==========
(async function init() {
    await loadEmojiData();
    refreshPanel();
    document.body.appendChild(panel);
    observeEditorToolbar();
    observeEditorClose();
})();







//能量/点数显示
console.log("能量显示脚本")

    function insertPowerEL() {
        let headerUL = document.getElementsByClassName("icons d-header-icons")[0]
        let newEle = document.createElement('li');
        newEle.setAttribute('id', 'nodeScoreHeader_score_id');
        newEle.setAttribute('style', `margin-left:12px;display: flex; align-items: center; justify-content: center;`)
        newEle.setAttribute('class', 'icon-header icon-header-small icon-header-link');
        newEle.innerHTML = `
        <button  style='    color: green;
    width: auto;' id="nodeScoreHeader_id_val" class="btn no-text btn-icon ai-bot-button icon btn-flat" title="当前能量" type="button">

        </button>

       `
        if(headerUL){
             headerUL.insertBefore(newEle, headerUL.firstChild);
        }
       
    }
    insertPowerEL()
    let userID = null
    function getUserID() {
        let retryCount = 0;
        const maxRetries = 60; // 1分钟（60次）
        const retryInterval = setInterval(() => {
            try {
                let userImgBTN = document.getElementById("toggle-current-user");
                if (userImgBTN) {
                    let srcURL = userImgBTN.getElementsByTagName("img")[0].src;
                    let srcArr = srcURL.split('/');
                    userID = srcArr[srcArr.length - 3];
                    clearInterval(retryInterval);
                    if (typeof getPower === 'function') {
                        getPower(userID);
                    }
                } else if (retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                    console.error("未找到userImgBTN元素，重试超时");
                }
                retryCount++;
            } catch (err) {
                console.error(err);
                if (retryCount >= maxRetries) {
                    clearInterval(retryInterval);
                }
            }
        }, 1000); // 每秒重试一次
    }
    getUserID()
    getPower(userID)

    function getPower(userID) {
        if(userID==null){
         console.log("userID 为空" )
           return
        }
        let url = `${window.location.origin}/u/${userID}.json`
        fetch(url) // 替换为实际的 URL
            .then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json(); // 或 response.text() 等
        })
            .then(data => {
            console.log(data.user.gamification_score);
            let score = data.user.gamification_score
            if (score) {
                if( document.getElementById("nodeScoreHeader_id_val")){
                     document.getElementById("nodeScoreHeader_id_val").innerText = score;
                }
               
            }



        })
            .catch(error => {
            console.error('发生错误:', error);
        });
    }
})();
