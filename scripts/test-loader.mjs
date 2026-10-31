// Lets Node run the app's ESM sources directly (extension-less imports, .js files treated as modules).
// Used by `npm run test:logic`.
import { register } from 'node:module';

const hooks = `
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') || spec.startsWith('/')) return next(spec + '.js', ctx);
    throw e;
  }
}
export async function load(url, ctx, next) {
  if (url.includes('/src/') && url.endsWith('.js')) return { ...(await next(url, { ...ctx, format: 'module' })), format: 'module' };
  return next(url, ctx);
}`;
register(`data:text/javascript,${encodeURIComponent(hooks)}`, import.meta.url);
