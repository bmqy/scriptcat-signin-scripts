# signin-scripts 项目说明

> 更新时间：2025-12-08 ｜ 撰写：Codex  
> 目标：以“模拟人工操作”为核心，为常用网站提供一键式每日签到脚本。

## 项目定位
- 通过 Vite + vite-plugin-monkey 生成用户脚本，依托浏览器与站点原生 Cookie，实现“人在现场”的签到方式。
- 仅模拟真实页面点击，不调用站点接口；保持与人工操作一致。
- 不做安全防护或额外抽象，保持实现简洁、可复用。
- 未来新增的所有站点必须遵循“只做页面级模拟点击，不使用接口或额外请求”的原则。

## 运行方式
- 开发调试：`npm run dev`（或 `pnpm run dev`），Vite 预览页面。
- 构建用户脚本：`npm run build`，产物位于 `dist/`。
- 生成脚本后导入到 Tampermonkey/暴力猴运行；脚本会按配置自动打开各站点完成签到。

## 核心结构
- `src/core`：调度与通用工具  
  - `bootstrap.ts`：入口，按当前 URL 匹配站点；否则由调度器逐站点唤醒。  
  - `scheduler.ts`：使用 `GM_openInTab` 打开站点并监听页面回传结果。  
  - `types.ts`：站点定义与上下文类型。  
  - `utils.ts`：延时、选择器等待、通知等基础能力。  
- `src/sites`：各站点的签到实现，遵循 `SiteDefinition`。

## 新站点接入步骤（建议复用）
1) 在 `src/sites` 新增 `xxx.ts`，实现 `SiteDefinition`：  
   - 指定 `id/name/entryUrl/matches`。  
   - `handler` 推荐使用 `src/core/flow.ts` 的 `runFlow` + `FlowStep[]`：用拖拽式思路编排“等待-点击-判断”等通用步骤；仅做页面模拟点击，不发起接口请求。  
2) 在 `src/sites/index.ts` 把站点加入 `sites` 数组。  
3) 在 `vite.config.ts` 的 `userscript.match` 中加入站点域名（如 `https://example.com/*`），确保页面能注入脚本。  
4) 若需要临时停用，可在 `SiteDefinition` 设置 `active: false`；调度器会跳过。  
5) 构建并在实际浏览器中验证。

## 自动与手动的隔离策略
- 定时/后台脚本仅负责“打开带标记的前台标签”，不会直接注入签到逻辑；页面脚本只有在 URL 含 `auto_signin=1` 时才会执行。  
- 手动浏览同一站点时，因为 URL 不含该标记，脚本会检测后直接退出，不会打扰正常浏览。  
- 调度器会在打开站点时自动追加 `?auto_signin=1`，页面脚本据此决定是否运行。

## 现有站点（均基于 FlowStep 流程编排）
- 掘金（新增）：  
  - 入口：`https://juejin.cn/user/center/signin`。  
  - 策略：FlowStep 组合“登录检测 → 等待按钮 → 选择器点击 → 文本校验”，主选择器 `.signin.btn`，仅依赖页面交互。  
- V2EX：保留实现但当前 `active: false`；同样用 FlowStep 流程点击领取按钮，不调用接口。

## 结果与提示
- 签到结果通过 `GM_notification` 与控制台输出。  
- 每站点每日仅运行一次（基于 `GM_setValue` 记录日期）。  
- 若页面未登录，脚本会返回失败信息，需要先手动登录。

## 测试与验证
- 当前仓库未内置自动化测试框架；请在浏览器中导入构建产物进行实际站点验证。  
- 建议用“已登录账户 + 打开开发者工具 Network”观察按钮文本变化与提示，确认成功后再添加更多站点。
