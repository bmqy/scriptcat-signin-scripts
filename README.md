# ScriptCat 签到脚本集合

一个基于浏览器用户脚本的多站点自动签到工具，通过模拟真实页面操作完成每日签到任务。

## ✨ 特性

- 🎯 **真实模拟**：模拟真实用户的页面点击操作，不直接调用站点接口
- 🔄 **自动调度**：支持定时自动打开各站点完成签到
- 🛡️ **手动隔离**：通过 URL 标记隔离自动与手动浏览，互不干扰
- 📦 **易于扩展**：提供 FlowStep 流程编排框架，新站点接入简单
- 🎨 **代码简洁**：保持实现简洁可读，易于理解和维护

## 📦 安装

### 前置要求

- Node.js 16+
- 浏览器扩展：Tampermonkey 或 暴力猴

### 构建步骤

```bash
# 安装依赖
npm install

# 开发调试
npm run dev

# 构建用户脚本
npm run build
```

构建产物位于 `dist/` 目录，将生成的脚本导入到 Tampermonkey/暴力猴即可使用。

## 🚀 使用说明

1. 构建并安装脚本到浏览器扩展
2. 访问各站点并手动登录一次
3. 脚本会在后台按配置的时间自动打开各站点完成签到
4. 签到结果通过浏览器通知展示

## 📁 项目结构

```
scriptcat-signin-scripts/
├── src/
│   ├── core/               # 核心功能模块
│   │   ├── bootstrap.ts    # 入口：URL 匹配与站点调度
│   │   ├── scheduler.ts    # 调度器：打开站点并监听结果
│   │   ├── flow.ts         # FlowStep 流程编排引擎
│   │   ├── types.ts        # 类型定义
│   │   └── utils.ts        # 工具函数
│   ├── sites/              # 各站点签到实现
│   │   ├── index.ts        # 站点注册入口
│   │   ├── juejin.ts       # 掘金签到
│   │   └── v2ex.ts         # V2EX 签到
│   ├── main.ts             # 主入口
│   ├── cron.ts             # 定时任务
│   └── subscribe.ts        # 订阅配置
├── dist/                   # 构建产物
└── vite.config.ts          # Vite 配置
```

## 🔧 开发指南

### 添加新站点

1. **创建站点文件**  
   在 `src/sites` 目录新增 `xxx.ts`，实现 `SiteDefinition` 接口：

   ```typescript
   import { SiteDefinition } from '../core/types';
   import { runFlow } from '../core/flow';

   export const xxxSite: SiteDefinition = {
     id: 'xxx',
     name: '站点名称',
     entryUrl: 'https://example.com/signin',
     matches: ['*://example.com/*'],
     handler: async (ctx) => {
       return runFlow(ctx, [
         // 使用 FlowStep 编排签到流程
         { type: 'wait', selector: '.signin-btn' },
         { type: 'click', selector: '.signin-btn' },
         { type: 'verify', selector: '.success-msg', text: '签到成功' }
       ]);
     }
   };
   ```

2. **注册站点**  
   在 `src/sites/index.ts` 中导入并添加到 `sites` 数组

3. **配置匹配规则**  
   在 `vite.config.ts` 的 `userscript.match` 中添加站点域名

4. **构建测试**  
   运行 `npm run build` 并在浏览器中验证

### FlowStep 流程编排

使用 `runFlow` 函数可以声明式地编排签到流程：

- `wait`：等待元素出现
- `click`：点击元素
- `verify`：验证结果
- `text`：获取文本内容
- `custom`：自定义操作

## 💡 工作原理

### 自动与手动隔离

- 调度器打开站点时会追加 `?auto_signin=1` 参数
- 页面脚本仅在检测到该参数时才执行签到逻辑
- 手动浏览站点时不会触发自动签到，互不干扰

### 执行流程

1. 调度器在指定时间打开各站点（带 `auto_signin=1` 标记）
2. 页面脚本匹配当前 URL，执行对应站点的签到逻辑
3. 通过 FlowStep 编排的流程进行页面操作
4. 签到结果通过 `GM_notification` 通知用户
5. 记录执行日期，每日仅执行一次

## 🌐 支持的站点

| 站点 | 状态 | 入口 URL |
|------|------|----------|
| 掘金 | ✅ 活跃 | https://juejin.cn/user/center/signin |
| V2EX | ⏸️ 已停用 | https://www.v2ex.com/mission/daily |

*所有站点均基于 FlowStep 流程编排实现*

## ⚠️ 注意事项

- 首次使用需手动登录各站点
- 每个站点每日仅自动签到一次
- 未登录状态下脚本会返回失败信息
- 签到结果通过浏览器通知和控制台输出

## 🧪 测试

当前项目未集成自动化测试框架，建议通过以下方式验证：

1. 在已登录账户下运行脚本
2. 打开浏览器开发者工具观察网络请求
3. 检查页面元素变化和通知消息
4. 确认签到成功后再添加到生产环境

## 📄 许可证

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发原则

- ✅ 仅模拟页面点击操作，不直接调用站点 API
- ✅ 保持代码简洁可读，易于维护
- ✅ 使用 FlowStep 编排签到流程
- ❌ 不添加复杂的安全防护或过度抽象
