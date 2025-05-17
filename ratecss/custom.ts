// 导入所需库
import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { Hono } from "hono";

// 初始化Hono应用
const app = new Hono();

// 扩展colord支持颜色名称插件
extend([namesPlugin]);

// 缓存时间常量（24小时）
const CACHE_DURATION = 86_400;

/**
 * 验证CSS颜色值是否有效
 * @param value 需要验证的颜色字符串
 * @returns 颜色是否有效
 */
function isValidCSSColor(value: string): boolean {
  return colord(value.trim()).isValid();
}

/**
 * 生成CSS内容
 * @param color 有效的CSS颜色值 
 * @returns 生成的CSS字符串
 */
function generateCSS(color: string): string {
  return `/* Dynamically generated - Color: ${color} */
.flex-interwiki-rate .page-rate-widget-box > .rate-points .number {
  color: ${color} !important;
}`;
}

app.get('/ratecss/custom', (c) => {
  // 获取并清理颜色参数
  const color = c.req.query('color')?.trim();

  // 参数缺失检查
  if (!color) {
    return c.text(
      '/* Error: Missing color parameter. Example: /ratecss/custom?color=white */',
      400,
      { 'Content-Type': 'text/css' }
    );
  }

  // 颜色格式验证
  if (!isValidCSSColor(color)) {
    return c.text(
      `/* Error: "${color}" is not a valid CSS color. Supported formats: hex, rgb, rgba, hsl, hsla, or named colors */`,
      400,
      { 'Content-Type': 'text/css' }
    );
  }

  // 返回生成的CSS
  return c.text(generateCSS(color), 200, {
    'Content-Type': 'text/css',
    'Cache-Control': `public, max-age=${CACHE_DURATION}`
  });
});

export default app;