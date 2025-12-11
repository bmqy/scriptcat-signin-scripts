import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 读取所有站点配置
const sitesPath = path.resolve(__dirname, 'src/sites');
const siteFiles = fs.readdirSync(sitesPath).filter(f => f.endsWith('.ts') && f !== 'index.ts');

// 构建配置：为每个站点生成独立脚本 + 定时脚本
const buildTargets = [];

for (const file of siteFiles) {
  const siteName = file.replace('.ts', '');
  buildTargets.push({
    name: `site-${siteName}`,
    entry: 'src/main.ts',
    output: `signin-${siteName}.user.js`,
    siteFilter: siteName,
  });
}

buildTargets.push({
  name: 'cron',
  entry: 'src/cron.ts',
  output: 'signin-cron.user.js',
});

console.log(`\n🚀 开始构建 ${buildTargets.length} 个脚本...\n`);

// 清空输出目录
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true, force: true });
}
fs.mkdirSync(distPath, { recursive: true });

// 依次构建每个目标
let successCount = 0;
let failCount = 0;

for (const target of buildTargets) {
  try {
    console.log(`📦 构建 ${target.name}...`);
    const env = { 
      ...process.env, 
      BUILD_TARGET: target.name, 
      BUILD_ENTRY: target.entry, 
      BUILD_OUTPUT: target.output,
    };
    if (target.siteFilter) {
      env.SITE_FILTER = target.siteFilter;
    }
    execSync(`cross-env BUILD_TARGET=${target.name} BUILD_ENTRY=${target.entry} BUILD_OUTPUT=${target.output}${target.siteFilter ? ` SITE_FILTER=${target.siteFilter}` : ''} vite build`, {
      stdio: 'inherit',
      env
    });
    successCount++;
  } catch (error) {
    console.error(`❌ 构建 ${target.name} 失败`);
    failCount++;
  }
}

// 构建订阅脚本
try {
  console.log(`📦 构建订阅脚本...`);
  
  // 读取 package.json 获取版本号
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  const SCRIPT_BASE_URL = process.env.SCRIPT_CDN_URL || 'https://raw.githubusercontent.com/bmqy/scriptcat-signin-scripts/main/dist';
  const PACKAGE_VERSION = pkg.version;
  
  // 生成订阅脚本内容 - 指向各个独立的站点脚本和定时脚本
  const scripts = buildTargets.map(target => `${SCRIPT_BASE_URL}/${target.output}`);
  const scriptUrlLines = scripts.map(url => `// @scriptUrl    ${url}`).join('\n');
  
  const subscribeContent = `// ==UserSubscribe==
// @name         脚本猫签到
// @namespace    https://github.com/bmqy/scriptcat-signin-scripts
// @version      ${PACKAGE_VERSION}
// @description  脚本猫签到脚本订阅 - 包含掘金、V2EX、定时调度脚本
// @author       bmqy
// @connect      juejin.cn
// @connect      www.v2ex.com
// @connect      *://*/*
${scriptUrlLines}
// ==/UserSubscribe==
`;
  
  // 写入文件
  const outputPath = path.resolve(distPath, 'signin-subscribe.user.sub.js');
  fs.writeFileSync(outputPath, subscribeContent, 'utf-8');
  
  console.log(`✅ 订阅脚本已生成`);
  console.log(`📦 脚本 CDN: ${SCRIPT_BASE_URL}`);
  console.log(`📋 脚本版本: ${PACKAGE_VERSION}`);
  successCount++;
} catch (error) {
  console.error(`❌ 构建订阅脚本失败`, error.message);
  failCount++;
}

console.log(`\n✅ 构建完成: ${successCount} 成功, ${failCount} 失败\n`);

if (failCount > 0) {
  process.exit(1);
}
