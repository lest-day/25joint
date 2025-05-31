/**
 * 终极 iframe 样式注入器 (v4.0)
 * 功能特性：
 * 1. 完全独立运行，无需父页面配合
 * 2. 多重CSS来源支持
 * 3. 智能重试与自适应注入
 * 4. 卓越的性能优化
 * 5. 增强的安全防护
 * 6. 完善的错误恢复机制
 */
;(function(global, factory) {
    // UMD包装，支持多种环境
    if (typeof define === 'function' && define.amd) {
      define([], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
      module.exports = factory();
    } else {
      global.iframeStyleInjector = factory();
    }
  })(this, function() {
    'use strict';
  
    // 默认配置
    const DEFAULT_CONFIG = {
      target: '#page-content div.rate',
      param: 'css',
      styleId: 'iframe-style-injector-ultimate',
      allowed: [
        // 布局
        'display', 'position', 'top', 'right', 'bottom', 'left',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        
        // 文本
        'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'text-decoration', 'line-height',
        
        // 背景和边框
        'background', 'background-color', 'background-image', 'background-position',
        'background-repeat', 'background-size',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color', 'border-radius',
        
        // 视觉效果
        'opacity', 'visibility', 'box-shadow', 'transform'
      ],
      injection: {
        maxRetry: 7,                    // 最大重试次数
        baseDelay: 100,                 // 基础延迟(ms)
        maxDelay: 3000,                 // 最大延迟(ms)
        timeout: 8000,                  // 超时时间(ms)
        useMutationObserver: true,      // 使用MutationObserver
        observeTarget: 'document',      // 观察目标: 'document'|'head'|'body'
        observeConfig: {                // MutationObserver配置
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false
        }
      },
      security: {
        sanitize: true,                 // 启用安全过滤
        maxCssLength: 2000,             // 最大CSS长度
        logErrors: true                 // 记录错误
      }
    };
  
    // 合并配置
    const CONFIG = (function() {
      const userConfig = (typeof window !== 'undefined' && window.IFRAME_STYLE_INJECTOR_CONFIG) || {};
      const config = Object.assign({}, DEFAULT_CONFIG, userConfig);
      
      // 深度合并injection配置
      if (userConfig.injection) {
        config.injection = Object.assign({}, DEFAULT_CONFIG.injection, userConfig.injection);
      }
      
      // 深度合并security配置
      if (userConfig.security) {
        config.security = Object.assign({}, DEFAULT_CONFIG.security, userConfig.security);
      }
      
      return config;
    })();
  
    // 环境检测
    const ENV = {
      isIframe: typeof window !== 'undefined' && window.self !== window.top,
      isDocumentReady: false,
      isWindowLoaded: false,
      retryCount: 0,
      injected: false,
      observer: null
    };
  
    // 性能优化：缓存DOM引用
    const DOC = typeof document !== 'undefined' ? document : null;
    const WIN = typeof window !== 'undefined' ? window : null;
  
    // 工具函数
    const Utils = {
      // 安全的日志记录
      log: function(message, level = 'log') {
        if (!CONFIG.security.logErrors) return;
        if (typeof console !== 'undefined' && console[level]) {
          try {
            console[level]('[IframeStyleInjector]', message);
          } catch (e) {}
        }
      },
      
      // 高性能选择器
      querySelector: function(selector) {
        try {
          return DOC && DOC.querySelector(selector);
        } catch (e) {
          return null;
        }
      },
      
      // 安全创建元素
      createElement: function(tagName) {
        try {
          return DOC && DOC.createElement(tagName);
        } catch (e) {
          return null;
        }
      },
      
      // 解析URL
      parseUrl: function(url, base) {
        try {
          return new URL(url, base);
        } catch (e) {
          return null;
        }
      },
      
      // 节流函数
      throttle: function(fn, delay) {
        let lastCall = 0;
        return function(...args) {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            return fn.apply(this, args);
          }
        };
      }
    };
  
    // CSS处理器
    const CssProcessor = {
      // 安全过滤CSS
      sanitize: function(css) {
        if (!CONFIG.security.sanitize) return css || '';
        if (typeof css !== 'string') return '';
        
        // 长度检查
        if (css.length > CONFIG.security.maxCssLength) {
          Utils.log(`CSS too long (${css.length} > ${CONFIG.security.maxCssLength})`, 'warn');
          return '';
        }
        
        // 分割并过滤规则
        return css.split(';')
          .map(rule => rule.trim())
          .filter(rule => {
            if (!rule) return false;
            
            const [prop, val] = rule.split(':').map(s => s.trim());
            if (!prop || !val) return false;
            
            // 检查属性是否在白名单中
            const propLower = prop.toLowerCase();
            return CONFIG.allowed.some(allowedProp => 
              propLower === allowedProp.toLowerCase()
            );
          })
          .join(';');
      },
      
      // 标准化选择器
      normalizeSelector: function(selector) {
        if (typeof selector !== 'string') return '';
        return selector.trim().replace(/\s+/g, ' ');
      }
    };
  
    // DOM注入器
    const DomInjector = {
      // 创建样式元素
      createStyleElement: function() {
        const style = Utils.createElement('style');
        if (!style) return null;
        
        style.id = CONFIG.styleId;
        style.setAttribute('data-injected', 'true');
        return style;
      },
      
      // 注入样式到DOM
      inject: function(css) {
        if (!DOC || !css) return false;
        
        try {
          // 标准化选择器
          const targetSelector = CssProcessor.normalizeSelector(CONFIG.target);
          if (!targetSelector) return false;
          
          // 获取或创建样式元素
          let style = DOC.getElementById(CONFIG.styleId) || this.createStyleElement();
          if (!style) return false;
          
          // 设置样式内容
          style.textContent = `${targetSelector} { ${css} }`;
          
          // 确定插入位置
          const container = DOC.head || DOC.body || DOC.documentElement;
          if (!container) return false;
          
          // 插入或移动样式元素
          if (!style.parentNode) {
            container.appendChild(style);
          } else if (style.parentNode !== container) {
            container.appendChild(style);
          }
          
          ENV.injected = true;
          return true;
        } catch (e) {
          Utils.log(`DOM injection failed: ${e.message}`, 'error');
          return false;
        }
      },
      
      // 移除样式元素
      remove: function() {
        if (!DOC) return;
        
        try {
          const style = DOC.getElementById(CONFIG.styleId);
          if (style && style.parentNode) {
            style.parentNode.removeChild(style);
          }
        } catch (e) {
          Utils.log(`Style removal failed: ${e.message}`, 'error');
        }
      },
      
      // 检查是否已注入
      isInjected: function() {
        return DOC ? !!DOC.getElementById(CONFIG.styleId) : false;
      }
    };
  
    // CSS来源解析器
    const CssSourceParser = {
      // 从所有可能来源获取CSS
      getCss: function() {
        const sources = [
          this._fromCurrentUrl(),
          this._fromScriptElements(),
          this._fromDataAttributes()
        ];
        
        for (const css of sources) {
          if (css) return css;
        }
        
        return null;
      },
      
      // 从当前URL获取
      _fromCurrentUrl: function() {
        if (!WIN || !WIN.location) return null;
        
        try {
          const url = Utils.parseUrl(WIN.location.href);
          if (!url) return null;
          
          const cssParam = url.searchParams.get(CONFIG.param);
          return CssProcessor.sanitize(cssParam);
        } catch (e) {
          Utils.log(`URL parsing failed: ${e.message}`, 'error');
          return null;
        }
      },
      
      // 从脚本元素获取
      _fromScriptElements: function() {
        if (!DOC || !DOC.scripts) return null;
        
        try {
          const scripts = Array.from(DOC.scripts).reverse();
          for (const script of scripts) {
            if (!script.src) continue;
            
            const url = Utils.parseUrl(script.src);
            if (!url) continue;
            
            const cssParam = url.searchParams.get(CONFIG.param);
            if (cssParam) {
              const sanitized = CssProcessor.sanitize(cssParam);
              if (sanitized) return sanitized;
            }
          }
        } catch (e) {
          Utils.log(`Script parsing failed: ${e.message}`, 'error');
        }
        
        return null;
      },
      
      // 从data属性获取
      _fromDataAttributes: function() {
        if (!DOC || !DOC.currentScript) return null;
        
        try {
          const script = DOC.currentScript;
          if (script.dataset && script.dataset.css) {
            return CssProcessor.sanitize(script.dataset.css);
          }
        } catch (e) {
          Utils.log(`Data attribute parsing failed: ${e.message}`, 'error');
        }
        
        return null;
      }
    };
  
    // 注入控制器
    const InjectionController = {
      // 初始化注入流程
      init: function() {
        if (!ENV.isIframe) return;
        
        // 设置环境状态
        this._setupEnvironment();
        
        // 立即尝试注入
        this._attemptInjection();
        
        // 设置事件监听
        this._setupEventListeners();
        
        // 设置MutationObserver
        if (CONFIG.injection.useMutationObserver) {
          this._setupMutationObserver();
        }
        
        // 设置超时检查
        this._setupTimeoutCheck();
      },
      
      // 设置环境状态
      _setupEnvironment: function() {
        if (DOC) {
          ENV.isDocumentReady = DOC.readyState === 'complete' || 
                               DOC.readyState === 'interactive';
        }
      },
      
      // 尝试注入
      _attemptInjection: function() {
        if (ENV.injected) return true;
        
        const css = CssSourceParser.getCss();
        if (!css) {
          Utils.log('No valid CSS found in sources', 'info');
          return false;
        }
        
        const success = DomInjector.inject(css);
        if (success) {
          Utils.log('Style injected successfully', 'info');
          this._cleanup();
          return true;
        }
        
        return false;
      },
      
      // 带重试的注入
      _attemptInjectionWithRetry: function() {
        if (ENV.injected || ENV.retryCount >= CONFIG.injection.maxRetry) {
          return;
        }
        
        ENV.retryCount++;
        
        // 计算延迟时间（指数退避）
        const delay = Math.min(
          CONFIG.injection.baseDelay * Math.pow(2, ENV.retryCount - 1),
          CONFIG.injection.maxDelay
        );
        
        Utils.log(`Retry attempt ${ENV.retryCount}, delay: ${delay}ms`, 'info');
        
        setTimeout(() => {
          if (!this._attemptInjection()) {
            this._attemptInjectionWithRetry();
          }
        }, delay);
      },
      
      // 设置事件监听
      _setupEventListeners: function() {
        if (!DOC || !WIN) return;
        
        // 节流的事件处理
        const throttledInjection = Utils.throttle(() => {
          this._attemptInjection();
        }, 200);
        
        // DOMContentLoaded事件
        if (!ENV.isDocumentReady) {
          DOC.addEventListener('DOMContentLoaded', () => {
            ENV.isDocumentReady = true;
            throttledInjection();
          });
        }
        
        // load事件
        WIN.addEventListener('load', () => {
          ENV.isWindowLoaded = true;
          throttledInjection();
        });
        
        // 页面显示事件（对于隐藏的iframe）
        if (DOC.visibilityState) {
          DOC.addEventListener('visibilitychange', throttledInjection);
        }
      },
      
      // 设置MutationObserver
      _setupMutationObserver: function() {
        if (!DOC || typeof MutationObserver === 'undefined') return;
        
        // 确定观察目标
        let target;
        switch (CONFIG.injection.observeTarget) {
          case 'head': target = DOC.head; break;
          case 'body': target = DOC.body; break;
          default: target = DOC.documentElement;
        }
        
        if (!target) return;
        
        // 创建并启动Observer
        ENV.observer = new MutationObserver(() => {
          if (!DomInjector.isInjected()) {
            this._attemptInjection();
          }
        });
        
        try {
          ENV.observer.observe(target, CONFIG.injection.observeConfig);
        } catch (e) {
          Utils.log(`MutationObserver setup failed: ${e.message}`, 'error');
        }
      },
      
      // 设置超时检查
      _setupTimeoutCheck: function() {
        if (!WIN) return;
        
        WIN.setTimeout(() => {
          if (!ENV.injected) {
            Utils.log('Injection timeout reached', 'warn');
            this._cleanup();
          }
        }, CONFIG.injection.timeout);
      },
      
      // 清理资源
      _cleanup: function() {
        if (ENV.observer) {
          try {
            ENV.observer.disconnect();
            ENV.observer = null;
          } catch (e) {
            Utils.log('Observer disconnect failed', 'error');
          }
        }
      }
    };
  
    // 启动注入器
    if (DOC) {
      if (DOC.readyState === 'complete') {
        InjectionController.init();
      } else {
        DOC.addEventListener('DOMContentLoaded', () => InjectionController.init());
      }
    }
  
    // 公开API
    return {
      config: CONFIG,
      inject: function(css) {
        return DomInjector.inject(CssProcessor.sanitize(css));
      },
      remove: DomInjector.remove,
      isInjected: DomInjector.isInjected
    };
  });