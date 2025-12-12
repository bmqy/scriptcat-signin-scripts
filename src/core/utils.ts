import type { TaskResult } from './types';

export const statusKeyFor = (siteId: string) => `signin:status:${siteId}`;
export const lastRunKeyFor = (siteId: string) => `signin:last:${siteId}`;
export const AUTO_PARAM = 'auto_signin';

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const isSameDay = (timestamp?: number) => {
  if (!timestamp) return false;
  const last = new Date(timestamp);
  const now = new Date();
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
};

export const matchGlob = (pattern: string, url: string) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  return regex.test(url);
};

export const waitForSelector = async (
  selector: string,
  timeoutMs = 8000,
): Promise<Element | null> => {
  if (typeof document === 'undefined') return null;
  const found = document.querySelector(selector);
  if (found) return found;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
};

export const notify = (title: string, text: string) => {
  if (typeof GM_notification !== 'undefined') {
    GM_notification({ title, text, timeout: 5000 });
  } else {
    console.log(`[notify] ${title}: ${text}`);
  }
};

export const normalizeResult = (result?: TaskResult): TaskResult => {
  if (!result) return { success: false, message: '未返回结果' };
  return {
    success: Boolean(result.success),
    message: result.message ?? '',
  };
};

export const debug = (siteId: string, message: string) => {
  const prefix = `[signin][${siteId}] ${message}`;
  if (typeof GM_log !== 'undefined') {
    GM_log(prefix);
  } else {
    console.log(prefix);
  }
};

export const isAutoSignin = () => {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const hasParam = url.searchParams.get(AUTO_PARAM) === '1' || url.hash.includes(`${AUTO_PARAM}=1`);

  // 记录当前标签的自动签到标记，防止站点重定向丢失查询参数
  if (hasParam) {
    try {
      window.sessionStorage.setItem('signin:auto:flag', '1');
    } catch (_) {
      /* ignore */
    }
    return true;
  }

  try {
    return window.sessionStorage.getItem('signin:auto:flag') === '1';
  } catch (_) {
    return false;
  }
};

export const appendAutoParam = (url: string) => {
  try {
    const u = new URL(url);
    u.searchParams.set(AUTO_PARAM, '1');
    return u.toString();
  } catch (_) {
    // 简单兜底：若 URL 解析失败，直接拼接参数
    return url.includes('?') ? `${url}&${AUTO_PARAM}=1` : `${url}?${AUTO_PARAM}=1`;
  }
};
