import { runFlow, type FlowStep } from '../core/flow';
import type { SiteDefinition } from '../core/types';
import { debug } from '../core/utils';

const v2exSteps: FlowStep[] = [
  {
    type: 'ensure-not-text',
    selector: undefined,
    text: '需要先登录',
    failMessage: '未登录 V2EX，请先登录后再尝试',
  },
  { type: 'wait', selector: '#Main input[type="button"]', timeoutMs: 8000 },
  {
    type: 'click-first',
    selectors: ['#Main input[type="button"]'],
    failMessage: '未找到领取按钮，可能今日已领取',
  },
  { type: 'delay', ms: 1200 },
  {
    type: 'check-text',
    selector: undefined,
    includes: ['每日登录奖励已领取', '已领取', '已成功领取', '签到成功', '已签到'],
    successMessage: 'V2EX 登录奖励领取成功',
    failMessage: '已点击领取按钮，但未看到成功提示，请人工确认',
  },
];

export const v2ex: SiteDefinition = {
  id: 'v2ex',
  name: 'V2EX 每日签到',
  entryUrl: 'https://www.v2ex.com/mission/daily',
  // 允许附带查询参数（如 auto_signin=1），使用通配符结尾
  matches: ['https://www.v2ex.com/mission/daily*'],
  description: '流程化页面点击领取每日奖励，不调用接口',
  handler: async (ctx) => {
    debug(ctx.site.id, '开始 runFlow v2ex');
    const res = await runFlow(ctx, v2exSteps);
    debug(ctx.site.id, `结束 runFlow v2ex: ${res.message ?? ''}`);
    return res;
  },
};
