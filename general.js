// ==UserScript==
// @name         New Userscript WMMW-1
// @namespace    https://docs.scriptcat.org/
// @version      0.1.0
// @description  try to take over the world!
// @author       banlan
// @match        https://www.deepflood.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.deepflood.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

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

    mainBtn.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    (async function init() {
        await loadEmojiData();
        refreshPanel();
        document.body.appendChild(mainBtn);
        document.body.appendChild(panel);
    })();

})();
