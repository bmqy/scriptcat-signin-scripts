/**
 * 订阅脚本 - 返回所有签到脚本的订阅列表
 * 根据官方文档: https://docs.scriptcat.org/docs/dev/subscribe/
 * UserSubscribe 格式定义
 */

// 获取脚本 CDN 地址（可配置）
const SCRIPT_BASE_URL = import.meta.env.VITE_SCRIPT_CDN_URL || 'https://cdn.example.com/scripts';
const PACKAGE_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.3';

/**
 * 生成 UserSubscribe 格式的订阅脚本内容
 */
function generateSubscribeContent() {
  const scripts = [
    `${SCRIPT_BASE_URL}/signin-juejin.user.js`,
    `${SCRIPT_BASE_URL}/signin-v2ex.user.js`,
    `${SCRIPT_BASE_URL}/signin-cron.user.js`,
  ];

  const scriptUrlLines = scripts.map(url => `// @scriptUrl    ${url}`).join('\n');

  return `// ==UserSubscribe==
// @name         脚本猫签到
// @namespace    https://github.com/bmqy/scriptcat-signin-scripts
// @version      ${PACKAGE_VERSION}
// @description  脚本猫签到脚本订阅 - 包含多个站点的自动签到脚本
// @author       bmqy
// @connect      juejin.cn
// @connect      www.v2ex.com
// @connect      *://*/*
${scriptUrlLines}
// ==/UserSubscribe==
`;
}

// 在脚本环境下输出订阅内容
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const content = generateSubscribeContent();
    console.log('Subscription content:', content);
  });
}

export { generateSubscribeContent };

