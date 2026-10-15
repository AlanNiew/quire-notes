import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { ThemeMode } from '../theme';

const appWindow = getCurrentWindow();

/** 主题按钮点击后的循环：跟随系统 → 浅色 → 深色 → 跟随系统 */
const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const THEME_LABEL: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
};

/* ---------- 图标（内联 SVG，用 currentColor 跟随主题） ---------- */

function IconMinimize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0 5.5h10" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function IconRestore() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function IconTheme({ mode }: { mode: ThemeMode }) {
  const common = { width: 15, height: 15, viewBox: '0 0 18 18', fill: 'none' } as const;
  if (mode === 'light') {
    return (
      <svg {...common} aria-hidden="true">
        <circle cx="9" cy="9" r="3.6" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M9 1.2v2.1M9 14.7v2.1M1.2 9h2.1M14.7 9h2.1M3.5 3.5l1.5 1.5M13 13l1.5 1.5M14.5 3.5L13 5M5 13l-1.5 1.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (mode === 'dark') {
    return (
      <svg {...common} aria-hidden="true">
        <path
          d="M15.4 11.3A6.6 6.6 0 0 1 6.7 2.6a6.8 6.8 0 1 0 8.7 8.7z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // system：半明半暗的圆，代表“跟随系统”
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="9" cy="9" r="6.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9 2.4a6.6 6.6 0 0 1 0 13.2z" fill="currentColor" />
    </svg>
  );
}

/* ---------- 顶栏 ---------- */

type Props = {
  themeMode: ThemeMode;
  onThemeMode: (mode: ThemeMode) => void;
};

export default function TitleBar({ themeMode, onThemeMode }: Props) {
  const [maximized, setMaximized] = useState(false);

  // 跟踪最大化状态，好切换“最大化 / 还原”图标
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void appWindow.isMaximized().then(setMaximized);
    void appWindow
      .onResized(() => {
        void appWindow.isMaximized().then(setMaximized);
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, []);

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <span className="app-mark">M</span>
        <span className="app-name">Markdown Notes</span>
      </div>

      <div className="titlebar-right">
        <button
          className="theme-btn"
          title={`主题：${THEME_LABEL[themeMode]}（点击切换）`}
          onClick={() => onThemeMode(THEME_CYCLE[themeMode])}
        >
          <IconTheme mode={themeMode} />
        </button>

        <button className="win-btn" title="最小化" onClick={() => void appWindow.minimize()}>
          <IconMinimize />
        </button>
        <button
          className="win-btn"
          title={maximized ? '还原' : '最大化'}
          onClick={() => void appWindow.toggleMaximize()}
        >
          {maximized ? <IconRestore /> : <IconMaximize />}
        </button>
        <button
          className="win-btn close"
          title="关闭"
          onClick={() => void appWindow.close()}
        >
          <IconClose />
        </button>
      </div>
    </header>
  );
}
