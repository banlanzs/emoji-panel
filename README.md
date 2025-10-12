### 表情包存储脚本
| 脚本 | 描述 |
|------|------|
| [general.js](./general.js) | 通用脚本 |
| [embed_discourse.js](./embed_discourse.js) | discourse框架论坛直接嵌入编辑框，点击表情包直接嵌入编辑框，默认100X100，可分类，可删除，可一键导入导出 |
| [dicourse_comprehensive.js](./discourse_comprehensive.js) | 一个discourse框架论坛的脚本，如新标签页打开，返回顶部，表情包嵌入等，以及刷新网页（搭配某些脚本) |

----------------------
[dicourse_comprehensive.js](./dicourse_comprehensive.js)若要将表情包按钮从编辑框拿出来，将下列代码取消注释
```
// mainBtn.addEventListener("click", () => {
    //     panel.style.display = panel.style.display === "none" ? "block" : "none";
    // });

    // (async function init() {
    //     await loadEmojiData();
    //     refreshPanel();
    //     document.body.appendChild(mainBtn);
    //     document.body.appendChild(panel);
    // })();
```
再将该段代码下的（点数/能量显示上方的）逻辑注释掉即可，~~不注释也没关系~~
