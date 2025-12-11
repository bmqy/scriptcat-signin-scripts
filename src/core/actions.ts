import type { PageContext, TaskResult } from './types';

const normalizeText = (text?: string) => (text ?? '').replace(/\s+/g, '').trim();

const hasSuccessText = (text: string, successTexts: string[]) =>
  successTexts.some((t) => text.includes(t.replace(/\s+/g, '')) || t.replace(/\s+/g, '').includes(text));

const findElementBySelectors = (selectors: string[], successTexts: string[]) => {
  if (typeof document === 'undefined') return null;
  for (const selector of selectors) {
    const nodes = document.querySelectorAll<HTMLElement>(selector);
    for (const el of Array.from(nodes)) {
      const text = normalizeText(el.textContent ?? '');
      if (!text) continue;
      if (hasSuccessText(text, successTexts)) {
        return el;
      }
    }
  }
  return null;
};

export interface ClickSignOptions {
  selectors: string[];
  successTexts: string[];
  loginCheck?: () => { ok: boolean; message?: string };
  clickDelayMs?: number;
}

/**
 * 纯页面点击式签到的通用封装，方便各站点复用。
 */
export const composeClickSignHandler = (options: ClickSignOptions) => {
  const { selectors, successTexts, loginCheck, clickDelayMs = 1500 } = options;

  return async (ctx: PageContext): Promise<TaskResult> => {
    if (typeof document === 'undefined') {
      return { success: false, message: '缺少浏览器环境，无法执行签到' };
    }

    if (loginCheck) {
      const check = loginCheck();
      if (!check.ok) {
        return { success: false, message: check.message ?? '未登录，无法签到' };
      }
    }

    const btn = findElementBySelectors(selectors, successTexts);
    if (!btn) {
      return { success: false, message: '未找到签到按钮，请手动确认页面结构' };
    }

    const before = btn.textContent ?? '';
    btn.click();
    await ctx.delay(clickDelayMs);
    const after = btn.textContent ?? '';

    const beforeNorm = normalizeText(before);
    const afterNorm = normalizeText(after);
    const bodyText = normalizeText(document.body?.innerText ?? '');

    const success =
      (afterNorm && afterNorm !== beforeNorm && hasSuccessText(afterNorm, successTexts)) ||
      hasSuccessText(bodyText, successTexts);

    return {
      success,
      message: success
        ? `签到成功（按钮文本：${after.trim() || '空'}）`
        : `已点击按钮，但文本未显示成功状态（前：“${before.trim()}”，后：“${after.trim()}”）`,
    };
  };
};
