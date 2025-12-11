import type { SiteDefinition, TaskResult } from './types';
import {
    appendAutoParam,
    delay,
    isSameDay,
    lastRunKeyFor,
    normalizeResult,
    notify,
    statusKeyFor,
} from './utils';

const DEFAULT_TIMEOUT = 2 * 60 * 1000;

const markRun = (siteId: string, success: boolean) => {
  if (success) {
    GM_setValue(lastRunKeyFor(siteId), Date.now());
  }
};

const hasRunToday = (siteId: string) => {
  const ts = GM_getValue<number | undefined>(lastRunKeyFor(siteId));
  return isSameDay(ts);
};

const waitForPageResult = (siteId: string, timeoutMs: number): Promise<TaskResult> =>
  new Promise((resolve) => {
    const key = statusKeyFor(siteId);
    const listenerId = GM_addValueChangeListener(key, (_name, _old, next, remote) => {
      if (!remote) return;
      cleanup();
      resolve(normalizeResult(next as TaskResult));
    });

    const timer = setTimeout(() => {
      cleanup();
      const msg = '等待页面结果超时，可能页面未注入脚本或未匹配到站点';
      if (typeof GM_log !== 'undefined') {
        GM_log(`[signin][${siteId}] ${msg}`);
      } else {
        console.log(`[signin][${siteId}] ${msg}`);
      }
      resolve({ success: false, message: msg });
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      GM_removeValueChangeListener(listenerId);
    };
  });

export const triggerByTab = async (site: SiteDefinition, timeoutMs = DEFAULT_TIMEOUT) => {
  GM_deleteValue(statusKeyFor(site.id));

  // 后台打开标签页，避免打断当前活动标签
  try {
    const tabOptions: GmOpenInTabOptions & Record<string, unknown> = {
      active: false, // 不激活新标签
      insert: true,
      setParent: true,
      loadInBackground: true,
    };
    GM_openInTab(appendAutoParam(site.entryUrl), tabOptions);
  } catch (_) {
    // ignore，保持后续结果等待
  }

  return waitForPageResult(site.id, timeoutMs);
};

export const runScheduledTasks = async (sites: SiteDefinition[]) => {
  for (const site of sites) {
    if (site.active === false) continue;
    if (hasRunToday(site.id)) continue;

    if (typeof GM_log !== 'undefined') {
      GM_log(`[signin][schedule] 开始执行 ${site.id}`);
    } else {
      console.log(`[signin][schedule] 开始执行 ${site.id}`);
    }
    const result = await triggerByTab(site);
    markRun(site.id, result.success);

    notify(site.name, result.message ?? (result.success ? '签到完成' : '签到失败'));
    if (typeof GM_log !== 'undefined') {
      GM_log(`[signin][schedule] 完成 ${site.id}: ${result.message ?? ''}`);
    } else {
      console.log(`[signin][schedule] 完成 ${site.id}: ${result.message ?? ''}`);
    }
    await delay(500); // 给脚本猫一点缓冲时间
  }
};

export const reportResultFromPage = async (site: SiteDefinition, result: TaskResult) => {
  GM_setValue(statusKeyFor(site.id), normalizeResult(result));
};
