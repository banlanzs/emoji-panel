// ==UserScript==
// @name         New Userscript KCQA-1 (修复版)
// @namespace    https://docs.scriptcat.org/
// @version      0.1.1
// @description  表情包面板（修复版）
// @author       banlan
// @match        https://www.deepflood.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.deepflood.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 兼容 GM storage / 老的 GM_getValue / localStorage
    async function getVal(key, defaultValue) {
        try {
            if (typeof GM !== 'undefined' && typeof GM.getValue === 'function') {
                return await GM.getValue(key, defaultValue);
            }
            if (typeof GM_getValue === 'function') {
                // 老的同步 API
                const v = GM_getValue(key, defaultValue);
                return v === undefined ? defaultValue : v;
            }
        } catch (e) {
            // ignore and fallback to localStorage
            console.warn('getVal: GM.getValue failed, fallback to localStorage', e);
        }
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return defaultValue;
            return raw;
        } catch (e) {
            return defaultValue;
        }
    }

    async function setVal(key, value) {
        try {
            if (typeof GM !== 'undefined' && typeof GM.setValue === 'function') {
                return await GM.setValue(key, value);
            }
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
                return;
            }
        } catch (e) {
            console.warn('setVal: GM.setValue failed, fallback to localStorage', e);
        }
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('setVal: localStorage.setItem failed', e);
        }
    }

    // 存储键
    const STORAGE_KEY_V1 = "emojiLinksList";
    const STORAGE_KEY_V2 = "emojiLinksListV2"; // 新版本，JSON 字符串或对象

    let emojiData = {}; // {分类名: [url1, url2]}
    let currentCategory = "默认";
    let deleteMode = false;

    // 创建按钮 + 面板（先创建并加入页面，保证不会被后续 storage 错误阻断）
    const mainBtn = document.createElement("div");
    mainBtn.id = 'kcqa-emoji-main-btn';
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
    panel.id = 'kcqa-emoji-panel';
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

    // 把按钮和面板先加入页面，避免后续 storage 报错导致 UI 无法出现
    try {
        document.body.appendChild(mainBtn);
        document.body.appendChild(panel);
    } catch (e) {
        console.error('无法将界面元素添加到页面：', e);
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

    // 点击主按钮时不要让 document 的点击处理器把面板立即关掉
    mainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
    });

    // 点击页面其它地方时，只有在点击目标不在 panel 和 mainBtn 时才关闭
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !mainBtn.contains(e.target)) {
            closePanel();
        }
    });

    // 阻止面板内部点击关闭
    panel.addEventListener("click", (e) => e.stopPropagation());

    function closePanel() {
        if (panel && panel.style.display !== "none") panel.style.display = 'none';
    }

    // 以下为面板内部 UI 元素（与原脚本逻辑一致，略作清理与错误保护）
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

    const addBtn = createButton("添加图片", async () => {
        let lines = input.value.trim().split("\n").map(line => line.trim()).filter(line => line.length > 0);
        const markdownRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/;
        let extractedLinks = [];
        lines.forEach(line => {
            const match = line.match(markdownRegex);
            if (match) extractedLinks.push(match[1]);
            else if (line.startsWith('http')) extractedLinks.push(line);
        });
        if (extractedLinks.length === 0) return;
        if (!emojiData[currentCategory]) emojiData[currentCategory] = [];
        const allUrls = Object.values(emojiData).flat();
        let addedCount = 0;
        extractedLinks.forEach(url => {
            if (!allUrls.includes(url)) {
                emojiData[currentCategory].push(url);
                allUrls.push(url);
                addedCount++;
            }
        });
        if (addedCount > 0) {
            await saveEmojiData();
            refreshPanel();
        }
        input.value = '';
        if (addedCount === 0) alert('这些链接已存在于其他分类或当前分类，无需添加。');
        else if (addedCount < extractedLinks.length) alert(`已添加 ${addedCount} 个，跳过 ${extractedLinks.length - addedCount} 个重复。`);
    });

    const clearBtn = createButton("清空全部", async () => {
        if (!emojiData[currentCategory]) return;
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

    // 存储相关
    async function loadEmojiData() {
        // 先尝试加载新版本
        const storedV2 = await getVal(STORAGE_KEY_V2, null);
        if (storedV2) {
            try {
                emojiData = (typeof storedV2 === 'string') ? JSON.parse(storedV2) : storedV2;
                if (!emojiData || typeof emojiData !== 'object') emojiData = {};
                // 保证至少有默认分类
                if (Object.keys(emojiData).length === 0) emojiData['默认'] = [];
                currentCategory = Object.keys(emojiData)[0] || '默认';
                return;
            } catch (e) {
                console.warn('解析 STORAGE_KEY_V2 失败，尝试迁移 V1', e);
                emojiData = {};
            }
        }

        // 迁移旧版本（V1）
        const storedV1 = await getVal(STORAGE_KEY_V1, "[]");
        try {
            const oldList = (typeof storedV1 === 'string') ? JSON.parse(storedV1) : storedV1;
            if (Array.isArray(oldList)) {
                emojiData['默认'] = oldList;
                await saveEmojiData();
            } else {
                emojiData['默认'] = [];
            }
        } catch (e) {
            emojiData['默认'] = [];
        }
        currentCategory = '默认';
    }

    async function saveEmojiData() {
        await setVal(STORAGE_KEY_V2, JSON.stringify(emojiData));
    }

    // 初始化（只一个 init）
    (async function initAll() {
        try {
            await loadEmojiData();
            refreshPanel();
        } catch (e) {
            console.error('初始化数据时出现错误：', e);
            // 即便初始化失败，也保证面板显示（空数据）
            emojiData = emojiData || { '默认': [] };
            currentCategory = currentCategory || '默认';
            refreshPanel();
        }
    })();

})();
