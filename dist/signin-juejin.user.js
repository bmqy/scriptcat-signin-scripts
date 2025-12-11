// ==UserScript==
// @name         脚本猫签到·Juejin
// @namespace    https://github.com/bmqy/scriptcat-signin-scripts
// @version      0.0.3
// @author       bmqy
// @description  Juejin 页面签到脚本，仅在 URL 含 auto_signin=1 时运行
// @icon         https://scriptcat.org/favicon.ico
// @match        https://juejin.cn/*
// @connect      *://*/*
// @grant        GM_addValueChangeListener
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_log
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_removeValueChangeListener
// @grant        GM_setValue
// @grant        unsafeWindow
// @grant        window.close
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const statusKeyFor = (siteId) => `signin:status:${siteId}`;
  const lastRunKeyFor = (siteId) => `signin:last:${siteId}`;
  const AUTO_PARAM = "auto_signin";
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const isSameDay = (timestamp) => {
    if (!timestamp) return false;
    const last = new Date(timestamp);
    const now = new Date();
    return last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth() && last.getDate() === now.getDate();
  };
  const matchGlob = (pattern, url) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);
    return regex.test(url);
  };
  const waitForSelector = async (selector, timeoutMs = 8e3) => {
    if (typeof document === "undefined") return null;
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
        subtree: true
      });
    });
  };
  const notify = (title, text) => {
    if (typeof GM_notification !== "undefined") {
      GM_notification({ title, text, timeout: 5e3 });
    } else {
      console.log(`[notify] ${title}: ${text}`);
    }
  };
  const normalizeResult = (result) => {
    if (!result) return { success: false, message: "未返回结果" };
    return {
      success: Boolean(result.success),
      message: result.message ?? ""
    };
  };
  const debug = (siteId, message) => {
    const prefix = `[signin][${siteId}] ${message}`;
    if (typeof GM_log !== "undefined") {
      GM_log(prefix);
    } else {
      console.log(prefix);
    }
  };
  const isAutoSignin = () => {
    if (typeof window === "undefined") return false;
    const url = new URL(window.location.href);
    return url.searchParams.get(AUTO_PARAM) === "1" || url.hash.includes(`${AUTO_PARAM}=1`);
  };
  const appendAutoParam = (url) => {
    try {
      const u = new URL(url);
      u.searchParams.set(AUTO_PARAM, "1");
      return u.toString();
    } catch (_) {
      return url.includes("?") ? `${url}&${AUTO_PARAM}=1` : `${url}?${AUTO_PARAM}=1`;
    }
  };
  const DEFAULT_TIMEOUT = 2 * 60 * 1e3;
  const markRun = (siteId, success) => {
    if (success) {
      GM_setValue(lastRunKeyFor(siteId), Date.now());
    }
  };
  const hasRunToday = (siteId) => {
    const ts = GM_getValue(lastRunKeyFor(siteId));
    return isSameDay(ts);
  };
  const waitForPageResult = (siteId, timeoutMs) => new Promise((resolve) => {
    const key = statusKeyFor(siteId);
    const listenerId = GM_addValueChangeListener(key, (_name, _old, next, remote) => {
      if (!remote) return;
      cleanup();
      resolve(normalizeResult(next));
    });
    const timer = setTimeout(() => {
      cleanup();
      const msg = "等待页面结果超时，可能页面未注入脚本或未匹配到站点";
      if (typeof GM_log !== "undefined") {
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
  const triggerByTab = async (site, timeoutMs = DEFAULT_TIMEOUT) => {
    GM_deleteValue(statusKeyFor(site.id));
    try {
      const tabOptions = {
        active: false,
insert: true,
        setParent: true,
        loadInBackground: true
      };
      GM_openInTab(appendAutoParam(site.entryUrl), tabOptions);
    } catch (_) {
    }
    return waitForPageResult(site.id, timeoutMs);
  };
  const runScheduledTasks = async (sites2) => {
    for (const site of sites2) {
      if (site.active === false) continue;
      if (hasRunToday(site.id)) continue;
      if (typeof GM_log !== "undefined") {
        GM_log(`[signin][schedule] 开始执行 ${site.id}`);
      } else {
        console.log(`[signin][schedule] 开始执行 ${site.id}`);
      }
      const result = await triggerByTab(site);
      markRun(site.id, result.success);
      notify(site.name, result.message ?? (result.success ? "签到完成" : "签到失败"));
      if (typeof GM_log !== "undefined") {
        GM_log(`[signin][schedule] 完成 ${site.id}: ${result.message ?? ""}`);
      } else {
        console.log(`[signin][schedule] 完成 ${site.id}: ${result.message ?? ""}`);
      }
      await delay(500);
    }
  };
  const reportResultFromPage = async (site, result) => {
    GM_setValue(statusKeyFor(site.id), normalizeResult(result));
  };
  const buildPageContext = (site) => ({
    site,
    report: (result) => reportResultFromPage(site, result),
    waitForSelector,
    delay
  });
  const bootstrap = async (sites2) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const target = sites2.find((site) => site.matches.some((pattern) => matchGlob(pattern, url)));
    if (target) {
      const msg = `[signin][page] 进入匹配站点 ${target.id}`;
      if (typeof GM_log !== "undefined") {
        GM_log(msg);
      } else {
        console.log(msg);
      }
      if (!isAutoSignin()) {
        if (typeof GM_log !== "undefined") GM_log("[signin][page] 未检测到 auto_signin=1，跳过执行");
        return;
      }
      const ctx = buildPageContext(target);
      if (typeof GM_log !== "undefined") {
        GM_log(`[signin][page] start handler ${target.id}`);
      }
      const result = await target.handler(ctx);
      if (typeof GM_log !== "undefined") {
        GM_log(`[signin][page] handler done ${target.id}: ${result.message ?? ""}`);
      }
      await ctx.report(result);
      if (typeof GM_notification !== "undefined") {
        GM_notification({
          title: `${target.name}`,
          text: result.message ?? (result.success ? "签到完成" : "签到失败"),
          timeout: 5e3
        });
      }
      try {
        window.close();
      } catch (_) {
      }
      return;
    }
    if (typeof GM_log !== "undefined") {
      GM_log("[signin][page] 未匹配到站点，进入调度模式");
    }
    await runScheduledTasks(sites2);
  };
  const normalize = (text) => (text ?? "").replace(/\s+/g, "").trim();
  const textIncludes = (selector, target) => {
    if (typeof document === "undefined") return false;
    const source = selector ? document.querySelector(selector)?.innerText ?? "" : document.body?.innerText ?? "";
    return normalize(source).includes(normalize(target));
  };
  const evalCondition = (cond) => {
    switch (cond.type) {
      case "text-includes": {
        const hit = textIncludes(cond.selector, cond.text);
        return cond.negate ? !hit : hit;
      }
      default:
        return false;
    }
  };
  const clickFirst = (selectors) => {
    if (typeof document === "undefined") return null;
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        el.click();
        return el;
      }
    }
    return null;
  };
  const isDebugEnabled = () => {
    try {
      return typeof GM_getValue !== "undefined" ? GM_getValue("signin:debug", true) : true;
    } catch (_) {
      return true;
    }
  };
  const debugLog = (ctx, msg) => {
    if (!isDebugEnabled()) return;
    const prefix = `[signin][${ctx.site.id}] ${msg}`;
    if (typeof GM_log !== "undefined") {
      GM_log(prefix);
    } else {
      console.log(prefix);
    }
  };
  const runFlow = async (ctx, steps) => {
    let lastMessage = "";
    for (const step of steps) {
      debugLog(ctx, `开始步骤: ${step.type}`);
      switch (step.type) {
        case "ensure-not-text": {
          const fail = textIncludes(step.selector, step.text);
          if (fail) {
            debugLog(ctx, `ensure-not-text 触发失败: ${step.failMessage}`);
            return { success: false, message: step.failMessage };
          }
          break;
        }
        case "wait": {
          await ctx.waitForSelector(step.selector, step.timeoutMs);
          debugLog(ctx, `wait 完成: ${step.selector}`);
          break;
        }
        case "delay": {
          await ctx.delay(step.ms);
          debugLog(ctx, `delay ${step.ms}ms 完成`);
          break;
        }
        case "click-first": {
          const clicked = clickFirst(step.selectors);
          if (!clicked) {
            debugLog(ctx, "click-first 未找到元素");
            return { success: false, message: step.failMessage ?? "未找到可点击的签到按钮" };
          }
          debugLog(ctx, `click-first 已点击: ${step.selectors.join(", ")}`);
          break;
        }
        case "check-text": {
          const includes = step.includes.some((t) => textIncludes(step.selector, t));
          if (!includes) {
            debugLog(ctx, `check-text 失败，未包含目标文案: ${step.includes.join(" / ")}`);
            return { success: false, message: step.failMessage ?? "文本未显示成功状态" };
          }
          if (step.successMessage) lastMessage = step.successMessage;
          debugLog(ctx, `check-text 命中: ${step.successMessage ?? "success"}`);
          break;
        }
        case "branch": {
          const cond = evalCondition(step.condition);
          debugLog(ctx, `branch 条件 ${cond ? "为真" : "为假"}`);
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
        case "result": {
          debugLog(ctx, `result: ${step.success} - ${step.message}`);
          return { success: step.success, message: step.message };
        }
      }
    }
    debugLog(ctx, `流程结束: ${lastMessage || "签到流程执行完成"}`);
    return { success: true, message: lastMessage || "签到流程执行完成" };
  };
  const juejinSteps = [
    {
      type: "ensure-not-text",
      selector: void 0,
      text: "登录/注册",
      failMessage: "未登录掘金，请先登录后再尝试"
    },
    { type: "wait", selector: '.signin.btn, button, a, div[role="button"]', timeoutMs: 8e3 },
    {
      type: "click-first",
      selectors: [
        ".signin.btn",
        "button.signin",
        ".signin button",
        'button[data-event-name="signin"]',
        'button[data-evt="signin"]',
        ".sign .btn",
        ".sign .sign-btn",
        "button",
        "a",
        'div[role="button"]'
      ],
      failMessage: "未找到签到按钮，请检查页面结构"
    },
    { type: "delay", ms: 1500 },
    {
      type: "check-text",
      selector: void 0,
      includes: ["今日已签到", "已签到", "已完成", "已连续", "签到成功"],
      successMessage: "掘金签到成功（文本确认）",
      failMessage: "按钮已点击，但未看到成功提示，请人工确认"
    }
  ];
  const juejin = {
    id: "juejin",
    name: "掘金每日签到",
    entryUrl: "https://juejin.cn/user/center/signin",
    matches: ["https://juejin.cn/*"],
    description: "流程化页面点击签到，基于通用步骤组合",
    handler: async (ctx) => {
      debug(ctx.site.id, "开始 runFlow juejin");
      const res = await runFlow(ctx, juejinSteps);
      debug(ctx.site.id, `结束 runFlow juejin: ${res.message ?? ""}`);
      return res;
    }
  };
  const v2exSteps = [
    {
      type: "ensure-not-text",
      selector: void 0,
      text: "需要先登录",
      failMessage: "未登录 V2EX，请先登录后再尝试"
    },
    { type: "wait", selector: '#Main input[type="button"]', timeoutMs: 8e3 },
    {
      type: "click-first",
      selectors: ['#Main input[type="button"]'],
      failMessage: "未找到领取按钮，可能今日已领取"
    },
    { type: "delay", ms: 1200 },
    {
      type: "check-text",
      selector: void 0,
      includes: ["每日登录奖励已领取", "已领取", "已成功领取", "签到成功", "已签到"],
      successMessage: "V2EX 登录奖励领取成功",
      failMessage: "已点击领取按钮，但未看到成功提示，请人工确认"
    }
  ];
  const v2ex = {
    id: "v2ex",
    name: "V2EX 每日签到",
    entryUrl: "https://www.v2ex.com/mission/daily",
matches: ["https://www.v2ex.com/mission/daily*"],
    description: "流程化页面点击领取每日奖励，不调用接口",
    handler: async (ctx) => {
      debug(ctx.site.id, "开始 runFlow v2ex");
      const res = await runFlow(ctx, v2exSteps);
      debug(ctx.site.id, `结束 runFlow v2ex: ${res.message ?? ""}`);
      return res;
    }
  };
  const sites = [
    juejin,
    v2ex
  ];
  bootstrap(sites).catch((error) => {
    console.error("Signin bootstrap error", error);
  });

})();