/**
 * 独立 iframe 样式注入器 (不依赖父页面)
 * @version 2.3.0
 */
(function() {
    'use strict';
    
    // 配置
    const CONFIG = {
      target: '#page-content div.rate',  // 目标元素选择器
      param: 'css',                     // URL参数名
      allowed: [                        // 允许的CSS属性
        'color', 'background', 'padding', 'margin',
        'font-size', 'font-weight', 'border',
        'width', 'height', 'display'
      ],
      iframe: {
        maxRetry: 5,                    // 最大重试次数
        retryDelay: 300,                // 重试间隔(ms)
        timeout: 5000                   // 超时时间(ms)
      }
    };
  
    // 环境检测
    const isIframe = window.self !== window.top;
    if (!isIframe) return;  // 只在iframe中运行
  
    // 安全CSS过滤
    function sanitize(css) {
      if (!css) return '';
      return css.split(';')
        .filter(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          return prop && val && CONFIG.allowed.some(a => 
            prop.toLowerCase() === a.toLowerCase()
          );
        })
        .join(';');
    }
  
    // 注入样式
    function inject(css) {
      try {
        // 移除旧样式
        const oldStyle = document.getElementById('iframe-style-injector');
        if (oldStyle) oldStyle.remove();
        
        // 创建新样式
        const style = document.createElement('style');
        style.id = 'iframe-style-injector';
        style.textContent = `${CONFIG.target} { ${css} }`;
        
        // 插入到文档
        (document.head || document.documentElement).appendChild(style);
        return true;
      } catch(e) {
        console.warn('Style injection failed:', e);
        return false;
      }
    }
  
    // 从URL获取CSS参数
    function getCssFromUrl() {
      try {
        // 检查当前URL参数
        const url = new URL(window.location.href);
        if (url.searchParams.has(CONFIG.param)) {
          return sanitize(url.searchParams.get(CONFIG.param));
        }
        
        // 检查所有脚本的src
        const scripts = Array.from(document.scripts);
        for (const script of scripts) {
          if (script.src && script.src.includes(CONFIG.param + '=')) {
            const scriptUrl = new URL(script.src);
            return sanitize(scriptUrl.searchParams.get(CONFIG.param));
          }
        }
        
        return null;
      } catch(e) {
        console.warn('URL parse error:', e);
        return null;
      }
    }
  
    // 带重试的注入流程
    function startInjection(retryCount = 0) {
      const css = getCssFromUrl();
      
      if (css) {
        if (inject(css)) return;  // 注入成功
      }
      
      // 重试逻辑
      if (retryCount < CONFIG.iframe.maxRetry) {
        setTimeout(() => {
          startInjection(retryCount + 1);
        }, CONFIG.iframe.retryDelay);
      } else {
        console.warn('Max retry attempts reached');
      }
    }
  
    // 初始化
    function init() {
      // 立即尝试
      startInjection();
      
      // DOM加载后再次尝试
      document.addEventListener('DOMContentLoaded', () => {
        startInjection();
      });
      
      // 设置超时
      setTimeout(() => {
        if (!document.getElementById('iframe-style-injector')) {
          console.warn('Style injection timeout');
        }
      }, CONFIG.iframe.timeout);
    }
  
    // 启动
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();