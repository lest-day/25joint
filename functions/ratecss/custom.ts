import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";
import { Hono } from "hono";

const app = new Hono();
extend([namesPlugin]);

// 核心CSS生成逻辑
app.get('/', (c) => {
  const color = c.req.query('color')?.trim();
  
  // 参数验证
  if (!color) {
    return c.text('/* Error: Missing color parameter */', 400, {
      'Content-Type': 'text/css'
    });
  }

  // 颜色格式验证
  if (!colord(color).isValid()) {
    return c.text(`/* Error: "${color}" is invalid */`, 400, {
      'Content-Type': 'text/css'
    });
  }

  // 成功响应
  return c.text(`
.flex-interwiki-rate .page-rate-widget-box > .rate-points .number {
  color: ${color};
}`, 200, {
    'Content-Type': 'text/css',
    'Cache-Control': 'public, max-age=86400'
  });
});

export default app;