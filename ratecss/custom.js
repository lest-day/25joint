/**
 * 动态安全样式注入器
 * @version 1.0.0
 * @license MIT
 */
(function(global, factory) {
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
  
    // 配置对象 - 可根据需要修改
    const CONFIG = {
      // 目标元素选择器
      targetSelector: '#page-content div.rate',
      
      // 允许的CSS属性白名单
      allowedProperties: [
        // 布局
        'display', 'position', 'top', 'right', 'bottom', 'left', 'float',
        'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
        
        // 盒模型
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-width', 'border-style', 'border-color',
        'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-radius', 'box-sizing', 'box-shadow',
        
        // 排版
        'color', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'text-decoration', 'line-height', 'letter-spacing',
        
        // 背景
        'background', 'background-color', 'background-image', 
        'background-position', 'background-repeat', 'background-size',
        
        // 其他
        'opacity', 'visibility', 'z-index', 'cursor', 'transition'
      ],
      
      // 参数名称
      paramName: 'css',
      
      // 调试模式
      debug: false
    };
  
    // 日志函数
    function log(message) {
      if (CONFIG.debug && console && console.log) {
        console.log('[DynamicStyleInjector] ' + message);
      }
    }
  
    // 验证和清理CSS规则
    function sanitizeCSS(rules) {
      if (!rules) return '';
      
      return rules.split(';')
        .map(rule => {
          const trimmed = rule.trim();
          if (!trimmed) return null;
          
          const [prop, value] = trimmed.split(':').map(s => s.trim());
          if (!prop || !value) return null;
          
          // 检查属性是否在白名单中
          const isAllowed = CONFIG.allowedProperties.some(
            allowed => prop.toLowerCase() === allowed.toLowerCase()
          );
          
          return isAllowed ? `${prop}:${value}` : null;
        })
        .filter(Boolean)
        .join(';');
    }
  
    // 应用样式
    function applyStyles() {
      try {
        // 获取当前脚本
        const script = document.currentScript || 
          Array.from(document.scripts).find(s => s.src.includes(CONFIG.paramName + '='));
        
        if (!script || !script.src) {
          log('未找到脚本元素');
          return;
        }
  
        // 解析URL参数
        const url = new URL(script.src);
        const cssRules = url.searchParams.get(CONFIG.paramName);
        
        if (!cssRules) {
          log('未找到样式参数');
          return;
        }
  
        // 清理和验证CSS
        const safeRules = sanitizeCSS(cssRules);
        if (!safeRules) {
          log('没有有效的CSS规则');
          return;
        }
  
        // 创建并插入样式
        const styleId = 'dynamic-style-' + Math.random().toString(36).substr(2, 9);
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `${CONFIG.targetSelector} { ${safeRules} }`;
        
        // 移除可能存在的旧样式
        const oldStyle = document.getElementById(styleId);
        if (oldStyle) oldStyle.remove();
        
        document.head.appendChild(style);
        log(`成功注入样式: ${safeRules}`);
  
      } catch (error) {
        log(`错误: ${error.message}`);
      }
    }
  
    // 初始化
    function init() {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        applyStyles();
      } else {
        document.addEventListener('DOMContentLoaded', applyStyles);
      }
    }
  
    // 暴露公共API
    return {
      init: init,
      config: function(newConfig) {
        Object.assign(CONFIG, newConfig);
      }
    };
  });
  
  // 自动执行
  if (typeof DynamicStyleInjector !== 'undefined') {
    DynamicStyleInjector.init();
  }