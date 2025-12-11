import { bootstrap } from './core/bootstrap';
import { sites } from './sites';

bootstrap(sites).catch((error) => {
  // 在脚本环境下尽量避免抛出未处理异常
  console.error('Signin bootstrap error', error);
});
