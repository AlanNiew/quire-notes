/**
 * 主题管理：跟随系统 / 手动浅色 / 手动深色
 *
 * 原理：把最终解析出的主题写到 <html data-theme="light|dark">，
 * CSS 变量按这个属性切换，因此顶栏、侧边栏、正文会一起变。
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'mn-theme-mode';

/** 读取用户上次选择的模式（默认跟随系统） */
export function readThemeMode(): ThemeMode {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

/** 记住用户选择 */
export function storeThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

/** 把模式解析成实际主题：system 时问系统 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 应用到 DOM，CSS 变量随之切换 */
export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(mode);
  root.dataset.themeMode = mode;
}
