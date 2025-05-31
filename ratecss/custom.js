/**
 * 高级独立 iframe 样式注入器 (v3.0)
 * 无需父页面配合，支持多种注入方式和智能重试
 */
(function() {
    'use strict';
    
    // 配置项 - 可通过在脚本加载前定义 window.IFRAME_STYLE_INJECTOR_CONFIG 来覆盖
    const CONFIG = Object.assign({
      target: '#page-content div.rate',  // 目标元素选择器
      param: 'css',                     // URL参数名
      styleId: 'iframe-style-injector', // 样式标签ID
      allowed: [                        // 允许的CSS属性
        'color', 'background', 'background-color', 'padding', 'margin',
        'font-size', 'font-weight', 'border', 'border-radius',
        'width', 'height', 'display', 'opacity', 'visibility',
        'box-shadow', 'text-align', 'line-height'
      ],
      iframe: {
        maxRetry: 5,                    // 最大重试次数
        retryDelay: 300,                // 初始重试间隔(ms)
        maxRetryDelay: 2000,            // 最大重试间隔(ms)
        timeout: 5000,                  // 超时时间(ms)
        useMutationObserver: true       // 是否使用MutationObserver监测DOM变化
      }
    }, window.IFRAME_STYLE_INJECTOR_CONFIG || {});
  
    // 环境检测
    const isIframe = window.self !== window.top;
    if (!isIframe) return;  // 只在iframe中运行
  
    // 性能优化：缓存常用DOM查询
    const doc = document;
    const head = doc.head;
    const root = doc.documentElement;
  
    // 安全CSS过滤
    function sanitize(css) {
      if (typeof css !== 'string') return '';
      
      return css.split(';')
        .map(rule => rule.trim())
        .filter(rule => {
          if (!rule) return false;
          const [prop, val] = rule.split(':').map(s => s.trim());
          return prop && val && CONFIG.allowed.some(allowedProp => 
            prop.toLowerCase() === allowedProp.toLowerCase()
          );
        })
        .join(';');
    }
  
    // 创建样式标签
    function createStyleElement() {
      const style = doc.createElement('style');
      style.id = CONFIG.styleId;
      style.setAttribute('data-injected', 'true');
      return style;
    }
  
    // 注入样式到DOM
    function injectStyles(css) {
      if (!css) return false;
      
      try {
        // 获取或创建样式标签
        let style = doc.getElementById(CONFIG.styleId) || createStyleElement();
        style.textContent = `${CONFIG.target} { ${css} }`;
        
        // 插入到最佳位置
        const container = head || root;
        if (!style.parentNode) {
          container.appendChild(style);
        }
        
        return true;
      } catch(e) {
        console.warn('[StyleInjector] Injection failed:', e);
        return false;
      }
    }
  
    // 从多个可能的位置获取CSS
    function getCssFromSources() {
      // 1. 检查当前URL参数
      try {
        const url = new URL(window.location.href);
        const cssParam = url.searchParams.get(CONFIG.param);
        if (cssParam) return sanitize(cssParam);
      } catch(e) { /* 忽略URL解析错误 */ }
      
      // 2. 检查所有脚本的src参数
      try {
        const scripts = Array.from(doc.scripts);
        for (const script of scripts) {
          if (!script.src) continue;
          
          try {
            const scriptUrl = new URL(script.src);
            const cssParam = scriptUrl.searchParams.get(CONFIG.param);
            if (cssParam) return sanitize(cssParam);
          } catch(e) { /* 忽略单个脚本URL解析错误 */ }
        }
      } catch(e) { /* 忽略脚本查询错误 */ }
      
      // 3. 检查data-*属性
      try {
        const injectorScript = Array.from(doc.scripts).find(script => 
          script.src.includes('style-injector') || 
          script.textContent.includes('StyleInjector')
        );
        
        if (injectorScript) {
          const datasetCss = injectorScript.dataset.css;
          if (datasetCss) return sanitize(datasetCss);
        }
      } catch(e) { /* 忽略dataset访问错误 */ }
      
      return null;
    }
  
    // 智能重试机制（带指数退避）
    function startInjection(retryCount = 0) {
      const css = getCssFromSources();
      
      if (css && injectStyles(css)) {
        return true; // 注入成功
      }
      
      // 计算下次重试延迟（指数退避算法）
      if (retryCount < CONFIG.iframe.maxRetry) {
        const delay = Math.min(
          CONFIG.iframe.retryDelay * Math.pow(2, retryCount),
          CONFIG.iframe.maxRetryDelay
        );
        
        setTimeout(() => {
          startInjection(retryCount + 1);
        }, delay);
      } else {
        console.warn('[StyleInjector] Max retry attempts reached');
        return false;
      }
    }
  
    // 使用MutationObserver监测DOM变化
    function setupMutationObserver() {
      if (!CONFIG.iframe.useMutationObserver) return;
      
      const observer = new MutationObserver(() => {
        if (!doc.getElementById(CONFIG.styleId)) {
          startInjection();
        }
      });
      
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
      
      return observer;
    }
  
    // 初始化
    function init() {
      // 立即尝试注入
      const success = startInjection();
      
      // 如果立即注入失败，设置各种后备方案
      if (!success) {
        // DOM加载事件
        doc.addEventListener('DOMContentLoaded', () => startInjection());
        
        // 窗口加载事件
        window.addEventListener('load', () => startInjection());
        
        // 设置MutationObserver
        setupMutationObserver();
        
        // 设置超时
        setTimeout(() => {
          if (!doc.getElementById(CONFIG.styleId)) {
            console.warn('[StyleInjector] Injection timeout');
          }
        }, CONFIG.iframe.timeout);
      }
    }
  
    // 启动（使用requestIdleCallback如果可用）
    if (doc.readyState === 'complete') {
      init();
    } else if (window.requestIdleCallback) {
      window.requestIdleCallback(() => init(), { timeout: 200 });
    } else {
      doc.addEventListener('DOMContentLoaded', init);
      window.addEventListener('load', init);
    }
  })();