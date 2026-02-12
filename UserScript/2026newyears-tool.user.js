// ==UserScript==
// @name         2026新年联竞 赛事管理工具
// @namespace    2026newyears-tool
// @version      2026-02-12
// @description  辅助2026三站新年联赛赛事组进行管理的工具合集，基于AI制作
// @author       AI (edit by lestday233)
// @match        *://syndication.wikidot.com/*
// @match        *://deep-forest-club.wikidot.com/*
// @match        *://asbackroom.wikidot.com/*
// @match        *://rule-wiki.wikidot.com/*
// @icon         https://syndication.wikidot.com/local--favicon/favicon.gif
// @updateURL    https://25joint.pages.dev/UserScript/2026newyears-tool.user.js
// @downloadURL  https://25joint.pages.dev/UserScript/2026newyears-tool.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成，确保 WIKIREQUEST 对象存在
    function waitForWikiRequest() {
        return new Promise((resolve) => {
            if (window.WIKIREQUEST && window.WIKIREQUEST.info) {
                return resolve(window.WIKIREQUEST.info);
            }
            const observer = new MutationObserver(() => {
                if (window.WIKIREQUEST && window.WIKIREQUEST.info) {
                    observer.disconnect();
                    resolve(window.WIKIREQUEST.info);
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
            // 超时处理
            setTimeout(() => resolve(null), 5000);
        });
    }

    // 检查是否存在目标 div
    function checkInterrateBlock() {
        return document.querySelector('div.interrate-block') !== null;
    }

    // 创建浮动按钮
    function createButton(siteUnixName, pageUnixName) {
        const btn = document.createElement('a');
        btn.href = `https://wikit.unitreaty.org/module/cross-rate-analyse.php?wiki=${encodeURIComponent(siteUnixName)}&page=${encodeURIComponent(pageUnixName)}`;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.textContent = '📊 跨站评分 分析面板';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 12px 24px;
            background-color: rgb(85, 122, 144);
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            cursor: pointer;
        `;
        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = 'rgb(85, 122, 144)';
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'rgb(85, 122, 144)';
            btn.style.transform = 'scale(1)';
        });
        return btn;
    }

    // 主逻辑
    async function init() {
        // 检查是否存在 interrate-block
        if (!checkInterrateBlock()) {
            return;
        }

        // 获取 WIKIREQUEST.info
        const wikiInfo = await waitForWikiRequest();
        if (!wikiInfo || !wikiInfo.siteUnixName || !wikiInfo.pageUnixName) {
            console.log('无法获取 Wiki 信息');
            return;
        }

        // 创建并添加按钮
        const button = createButton(wikiInfo.siteUnixName, wikiInfo.pageUnixName);
        document.body.appendChild(button);
    }

    // 执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();