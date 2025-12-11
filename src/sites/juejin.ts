import { runFlow, type FlowStep } from '../core/flow';
import { debug } from '../core/utils';
import type { SiteDefinition } from '../core/types';

const juejinSteps: FlowStep[] = [
  {
    type: 'ensure-not-text',
    selector: undefined,
    text: '登录/注册',
    failMessage: '未登录掘金，请先登录后再尝试',
  },
  { type: 'wait', selector: '.signin.btn, button, a, div[role="button"]', timeoutMs: 8000 },
  {
    type: 'click-first',
    selectors: [
      '.signin.btn',
      'button.signin',
      '.signin button',
      'button[data-event-name="signin"]',
      'button[data-evt="signin"]',
      '.sign .btn',
      '.sign .sign-btn',
      'button',
      'a',
      'div[role="button"]',
    ],
    failMessage: '未找到签到按钮，请检查页面结构',
  },
  { type: 'delay', ms: 1500 },
  {
    type: 'check-text',
    selector: undefined,
    includes: ['今日已签到', '已签到', '已完成', '已连续', '签到成功'],
    successMessage: '掘金签到成功（文本确认）',
    failMessage: '按钮已点击，但未看到成功提示，请人工确认',
  },
];

export const juejin: SiteDefinition = {
  id: 'juejin',
  name: '掘金每日签到',
  entryUrl: 'https://juejin.cn/user/center/signin',
  matches: ['https://juejin.cn/*'],
  description: '流程化页面点击签到，基于通用步骤组合',
  handler: async (ctx) => {
    debug(ctx.site.id, '开始 runFlow juejin');
    const res = await runFlow(ctx, juejinSteps);
    debug(ctx.site.id, `结束 runFlow juejin: ${res.message ?? ''}`);
    return res;
  },
};
