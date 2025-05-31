/**
 * Dynamic Style Injector - 生产环境实用版
 * @description 安全注入CSS样式，完美支持iframe环境
 * @version 2.2.0
 * @license MIT
 */
(function() {
    'use strict';
    
    // 配置设置（可根据需要修改）
    const config = {
      // 目标元素选择器
      target: '#page-content div.rate',
      
      // URL参数名称
      param: 'css',
      
      // 允许的CSS属性（精简生产环境白名单）
      allowed: [
        // 盒模型
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        
        // 样式
        'color', 'background', 'background-color',
        
        // 边框
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        
        // 文本
        'font-size', 'font-weight', 'line-height', 'text-align'
      ],
      
      // 是否启用!important
      important: false,
      
      // 调试模式
      debug: false
    };
  
    // 环境检测
    const isIframe = window.self !== window.top;
    const currentDoc = document;
    
    // 日志函数
    function log(message) {
      if (config.debug && console && console.log) {
        console.log('[StyleInjector]', message);
      }
    }
  
    // CSS规则验证
    function sanitizeRules(cssRules) {
      if (!cssRules) return '';
      
      return cssRules.split(';')
        .map(rule => {
          const [prop, val] = rule.split(':').map(s => s.trim());
          if (!prop || !val) return null;
          
          // 检查属性是否允许
          const isAllowed = config.allowed.some(
            allowed => prop.toLowerCase() === allowed.toLowerCase()
          );
          
          return isAllowed ? `${prop}:${val}${config.important ? ' !important' : ''}` : null;
        })
        .filter(Boolean)
        .join(';');
    }
  
    // 样式注入函数
    function injectStyles() {
      try {
        // 1. 获取当前脚本（兼容iframe）
        const scripts = currentDoc.scripts || [];
        const script = Array.from(scripts).reverse().find(s => {
          return s.src && s.src.includes(config.param + '=');
        });
        
        if (!script) {
          log('未找到脚本元素');
          return;
        }
  
        // 2. 解析URL参数
        let cssRules;
        try {
          const url = new URL(script.src, window.location.href);
          cssRules = url.searchParams.get(config.param);
        } catch (e) {
          log('URL解析失败: ' + e.message);
          return;
        }
        
        // 3. 验证CSS规则
        const safeRules = sanitizeRules(cssRules);
        if (!safeRules) {
          log('没有有效的CSS规则');
          return;
        }
  
        // 4. 创建样式标签
        const style = currentDoc.createElement('style');
        style.setAttribute('data-style-injector', '');
        style.textContent = `${config.target} { ${safeRules} }`;
        
        // 5. 插入到head或body
        if (currentDoc.head) {
          currentDoc.head.appendChild(style);
        } else {
          currentDoc.body.appendChild(style);
        }
        
        log(`样式注入成功: ${safeRules}`);
  
      } catch (error) {
        log('注入失败: ' + error.message);
      }
    }
  
    // 初始化函数
    function init() {
      // 立即尝试注入
      injectStyles();
      
      // iframe环境下增加额外监听
      if (isIframe) {
        currentDoc.addEventListener('DOMContentLoaded', injectStyles);
        window.addEventListener('load', injectStyles);
      }
    }
  
    // 根据文档状态启动
    if (currentDoc.readyState === 'loading') {
      currentDoc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();