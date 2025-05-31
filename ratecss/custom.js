/**
 * Dynamic Style Injector - 生产环境优化版
 * @description 通过URL参数安全注入CSS样式，支持细粒度属性如padding-top
 * @version 1.2.0
 * @license MIT
 */
;(function(global, factory) {
    // UMD模式支持
    if (typeof define === 'function' && define.amd) {
      define(factory);
    } else if (typeof exports !== 'undefined') {
      module.exports = factory();
    } else {
      global.DynamicStyleInjector = factory();
    }
  })(this, function() {
    'use strict';
  
    // 默认配置
    const DEFAULT_CONFIG = {
      // 目标元素选择器
      targetSelector: '#page-content div.rate',
      
      // 允许的CSS属性白名单（包含padding-top等细粒度属性）
      allowedProperties: [
        // 盒模型
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-width', 'border-style', 'border-color',
        'border-radius', 'box-sizing', 'box-shadow',
        
        // 布局
        'display', 'position', 'top', 'right', 'bottom', 'left', 'float',
        'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
        'overflow', 'overflow-x', 'overflow-y',
        
        // 排版
        'color', 'font', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'text-decoration', 'line-height', 'letter-spacing', 'white-space',
        
        // 背景
        'background', 'background-color', 'background-image', 
        'background-position', 'background-repeat', 'background-size',
        'background-clip', 'background-origin', 'background-attachment',
        
        // 视觉效果
        'opacity', 'visibility', 'z-index', 'cursor', 'transition',
        'transform', 'transform-origin', 'animation',
        
        // 其他
        'clip', 'clear', 'content', 'counter-reset', 'counter-increment'
      ],
      
      // 参数名称
      paramName: 'css',
      
      // 调试模式
      debug: true
    };
  
    // 当前配置
    let config = {...DEFAULT_CONFIG};
  
    // 日志系统
    const logger = {
      log: function(message) {
        if (config.debug && console && console.log) {
          console.log(`[DSI] ${message}`);
        }
      },
      warn: function(message) {
        if (console && console.warn) {
          console.warn(`[DSI] ${message}`);
        }
      },
      error: function(message) {
        if (console && console.error) {
          console.error(`[DSI] ${message}`);
        }
      }
    };
  
    /**
     * 安全验证和清理CSS规则
     * @param {string} cssRules - 原始CSS规则
     * @return {string} 清理后的安全CSS规则
     */
    function sanitizeCSS(cssRules) {
      if (typeof cssRules !== 'string') return '';
      
      return cssRules.split(';')
        .map(rule => {
          const trimmed = rule.trim();
          if (!trimmed) return null;
          
          const [prop, ...valueParts] = trimmed.split(':');
          const propName = prop.trim();
          const value = valueParts.join(':').trim();
          
          if (!propName || !value) return null;
          
          // 检查属性是否在白名单中（不区分大小写）
          const isAllowed = config.allowedProperties.some(
            allowed => propName.toLowerCase() === allowed.toLowerCase()
          );
          
          return isAllowed ? `${propName}:${value}` : null;
        })
        .filter(Boolean)
        .join(';');
    }
  
    /**
     * 应用样式到目标元素
     */
    function applyStyles() {
      try {
        // 获取当前脚本元素（兼容iframe环境）
        const script = document.currentScript || 
          Array.from(document.scripts).reverse().find(s => s.src.includes(config.paramName + '='));
        
        if (!script || !script.src) {
          logger.warn('无法定位脚本元素');
          return;
        }
  
        // 解析URL参数
        let cssRules;
        try {
          const url = new URL(script.src);
          cssRules = url.searchParams.get(config.paramName);
        } catch (e) {
          logger.error('URL解析失败: ' + e.message);
          return;
        }
        
        if (!cssRules) {
          logger.log('未找到样式参数');
          return;
        }
  
        // 清理和验证CSS规则
        const safeRules = sanitizeCSS(cssRules);
        if (!safeRules) {
          logger.warn('没有有效的CSS规则');
          return;
        }
  
        // 创建样式标签
        const styleId = 'dsi-style-' + Math.random().toString(36).substr(2, 8);
        const style = document.createElement('style');
        style.id = styleId;
        style.setAttribute('data-dynamic-injector', '');
        
        // 构建CSS规则
        const importantSuffix = config.useImportant ? ' !important' : '';
        const rules = safeRules.split(';')
          .map(rule => rule.trim())
          .filter(Boolean)
          .map(rule => rule + importantSuffix)
          .join(';');
        
        style.textContent = `${config.targetSelector} { ${rules} }`;
        
        // 移除旧样式（如果存在）
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) {
          oldStyle.remove();
          logger.log('移除旧样式');
        }
        
        // 插入到head最前面（提高优先级）
        if (document.head) {
          document.head.insertBefore(style, document.head.firstChild);
          logger.log(`成功注入样式: ${rules}`);
        } else {
          logger.error('文档head元素不存在');
        }
  
      } catch (error) {
        logger.error('样式注入失败: ' + error.message);
      }
    }
  
    /**
     * 初始化
     */
    function init() {
      // 提升优先级：不等待DOMContentLoaded
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        applyStyles();
      } else {
        document.addEventListener('readystatechange', function() {
          if (document.readyState !== 'loading') {
            applyStyles();
          }
        }, {once: true});
      }
    }
  
    // 公开API
    return {
      /**
       * 初始化注入器
       */
      init: init,
      
      /**
       * 更新配置
       * @param {Object} newConfig - 新配置
       */
      config: function(newConfig) {
        config = {...config, ...newConfig};
        logger.log('配置已更新');
      },
      
      /**
       * 重置为默认配置
       */
      resetConfig: function() {
        config = {...DEFAULT_CONFIG};
        logger.log('配置已重置');
      }
    };
  });
  
  // 自动初始化
  if (typeof DynamicStyleInjector !== 'undefined') {
    DynamicStyleInjector.init();
  }