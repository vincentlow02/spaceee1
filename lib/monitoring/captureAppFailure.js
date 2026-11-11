import * as Sentry from '@sentry/nextjs';

const validTag=/^[A-Za-z][A-Za-z0-9_]{0,39}$/;

export function captureAppFailure(error,{area,operation,code}={}) {
  try {
    Sentry.withScope(scope=>{
      const safeArea=validTag.test(area || '')?area:'application';
      const safeOperation=validTag.test(operation || '')?operation:'unknown';
      scope.setTag('failure_area',safeArea);
      scope.setTag('failure_operation',safeOperation);
      if (validTag.test(code || '')) scope.setTag('failure_code',code);
      scope.setFingerprint(['spaceee',safeArea,safeOperation,'{{ default }}']);
      Sentry.captureException(error instanceof Error?error:new Error('Application failure'));
    });
  } catch {
    console.warn('Sentry error reporting failed; application flow was not interrupted.');
  }
}
