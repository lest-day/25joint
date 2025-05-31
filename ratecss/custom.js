/**
 * 跨窗口安全样式注入器 (支持 iframe)
 * @version 2.1.0
 */
(function() {
    'use strict';
    
    // 配置 (可在调用前修改)
    const CONFIG = {
      target: '#page-content div.rate',
      param: 'css',
      allowed: [
        // 布局属性
        'display', 'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'float', 'clear', 'z-index',
        
        // 文本属性
        'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'text-decoration', 'text-transform', 'line-height',
        'letter-spacing', 'word-spacing', 'white-space',
        
        // 背景和边框
        'background', 'background-color', 'background-image', 'background-position',
        'background-repeat', 'background-size', 'background-attachment',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color', 'border-radius',
        'box-shadow', 'outline',
        
        // 视觉效果
        'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
        'clip', 'clip-path',
        
        // 变换和动画
        'transform', 'transition', 'animation',
        
        // 弹性盒子
        'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'justify-content',
        'align-items', 'align-content', 'order', 'flex-grow', 'flex-shrink',
        'flex-basis', 'align-self',
        
        // 网格布局
        'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
        'grid-template-areas', 'grid-gap', 'grid-column-gap', 'grid-row-gap',
        'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow', 'grid-column',
        'grid-row', 'grid-area', 'justify-items', 'align-items', 'place-items',
        'justify-self', 'align-self', 'place-self',
        
        // 其他常用属性
        'cursor', 'pointer-events', 'user-select', 'resize', 'object-fit',
        'box-sizing', 'vertical-align'
      ]
    };
  
    // 获取当前执行环境 (主窗口或iframe)
    const env = {
      isIframe: window.self !== window.top,
      targetWindow: window.self,  // 始终操作当前窗口
      targetDocument: document
    };
  
    // 安全CSS验证
    function sanitize(rules) {
      return (rules || '').split(';')
        .filter(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          return prop && val && CONFIG.allowed.some(a => prop.toLowerCase() === a.toLowerCase());
        })
        .join(';');
    }
  
    // 强力注入函数
    function inject() {
      try {
        // 1. 获取当前脚本 (跨环境兼容方案)
        const script = [].slice.call(env.targetDocument.scripts)
          .reverse()
          .find(s => s.src.includes(CONFIG.param + '='));
        
        if (!script) return;
  
        // 2. 解析参数 (兼容相对路径)
        const url = new URL(script.src, env.targetWindow.location.href);
        const css = sanitize(url.searchParams.get(CONFIG.param));
        if (!css) return;
  
        // 3. 创建样式标签
        const style = env.targetDocument.createElement('style');
        style.textContent = `${CONFIG.target} { ${css} }`;
        
        // 4. 多重注入策略
        if (env.targetDocument.head) {
          env.targetDocument.head.appendChild(style);
        } else {
          env.targetDocument.documentElement.appendChild(style);
        }
        
      } catch(e) {
        console.error('StyleInjector error:', e);
      }
    }
  
    // 智能初始化
    function init() {
      // 立即尝试
      inject();
      
      // iframe 额外保险
      if (env.isIframe) {
        env.targetDocument.addEventListener('DOMContentLoaded', inject);
        env.targetWindow.addEventListener('load', inject);
      }
    }
  
    // 自动执行
    if (document.readyState !== 'loading') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  })();