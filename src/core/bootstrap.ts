import { reportResultFromPage, runScheduledTasks } from './scheduler';
import type { PageContext, SiteDefinition, TaskResult } from './types';
import { delay, isAutoSignin, matchGlob, waitForSelector } from './utils';

const buildPageContext = (site: SiteDefinition): PageContext => ({
  site,
  report: (result: TaskResult) => reportResultFromPage(site, result),
  waitForSelector,
  delay,
});

export const bootstrap = async (sites: SiteDefinition[]) => {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const target = sites.find((site) => site.matches.some((pattern) => matchGlob(pattern, url)));

  if (target) {
    const msg = `[signin][page] 进入匹配站点 ${target.id}`;
    if (typeof GM_log !== 'undefined') {
      GM_log(msg);
    } else {
      console.log(msg);
    }

    // 未带 auto_signin 标记时不自动执行，避免打扰用户正常浏览
    if (!isAutoSignin()) {
      if (typeof GM_log !== 'undefined') GM_log('[signin][page] 未检测到 auto_signin=1，跳过执行');
      return;
    }

    const ctx = buildPageContext(target);
    if (typeof GM_log !== 'undefined') {
      GM_log(`[signin][page] start handler ${target.id}`);
    }
    const result = await target.handler(ctx);
    if (typeof GM_log !== 'undefined') {
      GM_log(`[signin][page] handler done ${target.id}: ${result.message ?? ''}`);
    }
    await ctx.report(result);

    // 执行结束后通知并尝试关闭任务标签（仅 auto_signin 模式）
    if (typeof GM_notification !== 'undefined') {
      GM_notification({
        title: `${target.name}`,
        text: result.message ?? (result.success ? '签到完成' : '签到失败'),
        timeout: 5000,
      });
    }
    try {
      window.close();
    } catch (_) {
      /* ignore */
    }
    return;
  }

  if (typeof GM_log !== 'undefined') {
    GM_log('[signin][page] 未匹配到站点，进入调度模式');
  }
  await runScheduledTasks(sites);
};
