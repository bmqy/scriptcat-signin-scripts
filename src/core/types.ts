export interface TaskResult {
  success: boolean;
  message?: string;
}

export interface SiteDefinition {
  /** 唯一标识，用于存储运行状态 */
  id: string;
  name: string;
  /** 后台调度时要打开的入口地址 */
  entryUrl: string;
  /** 页面上下文匹配规则（同 userscript @match 写法） */
  matches: string[];
  description?: string;
  /** 允许临时关闭某站点 */
  active?: boolean;
  /** 页面环境下执行具体签到逻辑 */
  handler: (ctx: PageContext) => Promise<TaskResult>;
}

export interface PageContext {
  site: SiteDefinition;
  /** 将执行结果写回后台监听 */
  report: (result: TaskResult) => Promise<void>;
  /** 等待目标元素出现 */
  waitForSelector: (selector: string, timeoutMs?: number) => Promise<Element | null>;
  /** 简单延时 */
  delay: (ms: number) => Promise<void>;
}
