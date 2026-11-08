import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Free Translate - 免费双语网页翻译',
    description: '支持 Chrome 本地模型、DeepL、Gemini、百度翻译与通用大模型接口的双语网页翻译扩展',
    version: '1.0.0',
    permissions: ['storage', 'contextMenus', 'activeTab'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Free Translate',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    commands: {
      'toggle-translate': {
        suggested_key: {
          default: 'Alt+A',
          mac: 'Alt+A',
        },
        description: '翻译或恢复当前网页',
      },
    },
  },
});
