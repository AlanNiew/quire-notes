import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { openUrl } from '@tauri-apps/plugin-opener';
import type { Components } from 'react-markdown';

/**
 * Markdown 实时预览。
 * react-markdown 负责把 Markdown 解析成 React 元素，
 * remark-gfm 补齐表格、任务列表、删除线这些 GitHub 风格扩展。
 */
const components: Components = {
  a: (props) => (
    <a
      {...props}
      onClick={(e) => {
        // 桌面应用里外链不走 WebView，交给系统默认浏览器打开
        e.preventDefault();
        if (typeof props.href === 'string') void openUrl(props.href);
      }}
    />
  ),
};

export default function Preview({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
