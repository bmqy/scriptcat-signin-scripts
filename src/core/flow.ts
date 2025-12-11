import type { PageContext, TaskResult } from './types';

type Condition =
  | {
      type: 'text-includes';
      selector?: string;
      text: string;
      negate?: boolean;
    };

export type FlowStep =
  | { type: 'ensure-not-text'; selector?: string; text: string; failMessage: string }
  | { type: 'wait'; selector: string; timeoutMs?: number }
  | { type: 'delay'; ms: number }
  | { type: 'click-first'; selectors: string[]; failMessage?: string }
  | { type: 'check-text'; selector?: string; includes: string[]; successMessage?: string; failMessage?: string }
  | { type: 'branch'; condition: Condition; ifTrue?: FlowStep[]; ifFalse?: FlowStep[] }
  | { type: 'result'; success: boolean; message: string };

const normalize = (text?: string) => (text ?? '').replace(/\s+/g, '').trim();

const textIncludes = (selector: string | undefined, target: string): boolean => {
  if (typeof document === 'undefined') return false;
  const source = selector
    ? document.querySelector<HTMLElement>(selector)?.innerText ?? ''
    : document.body?.innerText ?? '';
  return normalize(source).includes(normalize(target));
};

const evalCondition = (cond: Condition): boolean => {
  switch (cond.type) {
    case 'text-includes': {
      const hit = textIncludes(cond.selector, cond.text);
      return cond.negate ? !hit : hit;
    }
    default:
      return false;
  }
};

const clickFirst = (selectors: string[]): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      el.click();
      return el;
    }
  }
  return null;
};

const isDebugEnabled = () => {
  try {
    return typeof GM_getValue !== 'undefined' ? GM_getValue('signin:debug', true) : true;
  } catch (_) {
    return true;
  }
};

const debugLog = (ctx: PageContext, msg: string) => {
  if (!isDebugEnabled()) return;
  const prefix = `[signin][${ctx.site.id}] ${msg}`;
  if (typeof GM_log !== 'undefined') {
    GM_log(prefix);
  } else {
    console.log(prefix);
  }
};

export const runFlow = async (ctx: PageContext, steps: FlowStep[]): Promise<TaskResult> => {
  let lastMessage = '';

  for (const step of steps) {
    debugLog(ctx, `开始步骤: ${step.type}`);
    switch (step.type) {
      case 'ensure-not-text': {
        const fail = textIncludes(step.selector, step.text);
        if (fail) {
          debugLog(ctx, `ensure-not-text 触发失败: ${step.failMessage}`);
          return { success: false, message: step.failMessage };
        }
        break;
      }
      case 'wait': {
        await ctx.waitForSelector(step.selector, step.timeoutMs);
        debugLog(ctx, `wait 完成: ${step.selector}`);
        break;
      }
      case 'delay': {
        await ctx.delay(step.ms);
        debugLog(ctx, `delay ${step.ms}ms 完成`);
        break;
      }
      case 'click-first': {
        const clicked = clickFirst(step.selectors);
        if (!clicked) {
          debugLog(ctx, 'click-first 未找到元素');
          return { success: false, message: step.failMessage ?? '未找到可点击的签到按钮' };
        }
        debugLog(ctx, `click-first 已点击: ${step.selectors.join(', ')}`);
        break;
      }
      case 'check-text': {
        const includes = step.includes.some((t) => textIncludes(step.selector, t));
        if (!includes) {
          debugLog(ctx, `check-text 失败，未包含目标文案: ${step.includes.join(' / ')}`);
          return { success: false, message: step.failMessage ?? '文本未显示成功状态' };
        }
        if (step.successMessage) lastMessage = step.successMessage;
        debugLog(ctx, `check-text 命中: ${step.successMessage ?? 'success'}`);
        break;
      }
      case 'branch': {
        const cond = evalCondition(step.condition);
        debugLog(ctx, `branch 条件 ${cond ? '为真' : '为假'}`);
        if (cond && step.ifTrue) {
          const result = await runFlow(ctx, step.ifTrue);
          if (!result.success) return result;
          lastMessage = result.message ?? lastMessage;
        }
        if (!cond && step.ifFalse) {
          const result = await runFlow(ctx, step.ifFalse);
          if (!result.success) return result;
          lastMessage = result.message ?? lastMessage;
        }
        break;
      }
      case 'result': {
        debugLog(ctx, `result: ${step.success} - ${step.message}`);
        return { success: step.success, message: step.message };
      }
      default:
        break;
    }
  }

  debugLog(ctx, `流程结束: ${lastMessage || '签到流程执行完成'}`);
  return { success: true, message: lastMessage || '签到流程执行完成' };
};
