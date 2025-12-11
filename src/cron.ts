import { sites } from './sites';
import { runScheduledTasks } from './core/scheduler';

// 定时脚本入口：后台定时触发，负责打开前台标签触发页面脚本注入
(async () => {
  await runScheduledTasks(sites);
})();
