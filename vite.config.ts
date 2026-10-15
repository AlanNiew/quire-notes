import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tauri 会读取 vite 的配置，几个注意点：
// 1. 固定端口 1420，让 tauri.conf.json 里的 devUrl 能连上
// 2. clearScreen 关掉，否则 Rust 编译输出会把终端刷没
// 3. 不监听 src-tauri/，否则 Rust 文件变化会触发无意义的前端热更新
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: 'es2021',
    sourcemap: false,
  },
});
