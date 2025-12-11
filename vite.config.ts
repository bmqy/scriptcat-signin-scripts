import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import monkey, { type MonkeyOption } from 'vite-plugin-monkey';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 读取所有站点配置并获取 matches 信息
function getSitesMetadata() {
  const sitesPath = path.resolve(__dirname, 'src/sites');
  const siteFiles = fs.readdirSync(sitesPath).filter((f: string) => f.endsWith('.ts') && f !== 'index.ts');
  
  const metadata: Record<string, { name: string; matches: string[] }> = {};
  
  for (const file of siteFiles) {
    const siteName = file.replace('.ts', '');
    let matches = ['https://example.com/*'];
    
    try {
      const content = fs.readFileSync(path.resolve(sitesPath, file), 'utf-8');
      const matchesMatch = content.match(/matches:\s*\[(.*?)\]/s);
      if (matchesMatch) {
        matches = matchesMatch[1]
          .split(',')
          .map((m: string) => m.trim().replace(/['"]/g, ''))
          .filter(Boolean);
      }
    } catch (e) {
      console.warn(`⚠️  无法读取 ${file} 的 matches 配置`);
    }
    
    metadata[siteName] = {
      name: siteName.charAt(0).toUpperCase() + siteName.slice(1),
      matches,
    };
  }
  
  return metadata;
}

const sitesMetadata = getSitesMetadata();

// 生成定时调度配置
const cronConfig: MonkeyOption = {
  entry: 'src/cron.ts',
  userscript: {
    name: '脚本猫签到·定时调度',
    namespace: 'https://github.com/bmqy/scriptcat-signin-scripts',
    author: 'bmqy',
    description: '定时后台打开带 auto_signin=1 的站点标签，唤起对应页面签到脚本',
    icon: 'https://scriptcat.org/favicon.ico',
    match: ['https://example.com/*'],
    connect: ['*://*/*'],
    grant: [
      'GM_openInTab',
      'GM_setValue',
      'GM_getValue',
      'GM_addValueChangeListener',
      'GM_removeValueChangeListener',
      'GM_deleteValue',
      'GM_log',
    ],
    noframes: true,
    $extra: [
      ['crontab', '38 16 * * *'],
      ['background', 'true'],
    ],
  },
  build: { fileName: 'signin-cron.user.js' },
};

// 根据环境变量决定构建哪个脚本
const buildTarget = process.env.BUILD_TARGET;
const buildEntry = process.env.BUILD_ENTRY || 'src/main.ts';
const buildOutput = process.env.BUILD_OUTPUT || 'signin-all-sites.user.js';
const siteFilter = process.env.SITE_FILTER;

let pluginConfig: MonkeyOption;

if (buildTarget === 'cron') {
  pluginConfig = cronConfig;
} else if (buildTarget?.startsWith('site-')) {
  // 单个站点脚本
  const siteName = siteFilter || buildTarget.replace('site-', '');
  const siteInfo = sitesMetadata[siteName];
  
  if (!siteInfo) {
    console.error(`❌ 未找到站点 ${siteName} 的配置`);
    process.exit(1);
  }
  
  pluginConfig = {
    entry: buildEntry,
    userscript: {
      name: `脚本猫签到·${siteInfo.name}`,
      namespace: 'https://github.com/bmqy/scriptcat-signin-scripts',
      author: 'bmqy',
      description: `${siteInfo.name} 页面签到脚本，仅在 URL 含 auto_signin=1 时运行`,
      icon: 'https://scriptcat.org/favicon.ico',
      match: siteInfo.matches,
      connect: ['*://*/*'],
      grant: [
        'GM_openInTab',
        'GM_setValue',
        'GM_getValue',
        'GM_addValueChangeListener',
        'GM_removeValueChangeListener',
        'GM_deleteValue',
        'GM_notification',
        'GM_log',
        'unsafeWindow',
      ],
      'run-at': 'document-idle',
      noframes: true,
    },
    build: { fileName: buildOutput },
  };
} else {
  console.error('❌ 请使用 npm run build 命令构建脚本');
  process.exit(1);
}

export default defineConfig({
  plugins: [monkey(pluginConfig)],
  build: { 
    outDir: 'dist', 
    emptyOutDir: false,
  },
});
