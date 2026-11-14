import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { buildOrderProgress, formatStepTime, type ProgressSource } from '../../utils/orderProgress';

/**
 * v1.0.76 (Ankur, 14 Nov 2026): the customer's current order status, big and
 * clear (22px), as a step tracker: Order received -> Confirmed -> Packed ->
 * Dispatched -> Delivered. Current step highlighted; time shown where stored.
 * No hooks: the caller passes the language, so it renders the same everywhere.
 */
export function OrderStatusTracker({ order, hi, title }: { order: ProgressSource; hi: boolean; title?: string }) {
  const view = buildOrderProgress(order);
  const heading = title ?? (hi ? 'ऑर्डर की स्थिति' : 'Order status');
  if (view.cancelled) {
    return (
      <section aria-label={heading} data-no-translate className="ankur-order-tracker rounded-2xl border-2 border-rose-300 bg-rose-50 p-4">
        <p className="text-sm font-bold text-rose-800">{heading}</p>
        <p className="mt-1 flex items-center gap-2 font-black text-rose-800" style={{ fontSize: '22px', lineHeight: 1.25 }}>
          <AlertCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
          <span>{hi ? 'ऑर्डर रद्द हो गया' : 'Order cancelled'}</span>
        </p>
      </section>
    );
  }
  const current = view.currentIndex >= 0 ? view.steps[view.currentIndex] : null;
  return (
    <section aria-label={heading} data-no-translate className="ankur-order-tracker rounded-2xl border-2 border-sky-300 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-600">{heading}</p>
      {current && (
        <p role="status" className="ankur-order-tracker-current mt-1 font-black text-sky-800" style={{ fontSize: '24px', lineHeight: 1.2 }}>
          {hi ? current.hi : current.en}
        </p>
      )}
      <ol className="mt-3 space-y-0">
        {view.steps.map((step, i) => {
          const isCurrent = step.state === 'current';
          const isDone = step.state === 'done';
          const time = formatStepTime(step.timeMs, hi);
          const last = i === view.steps.length - 1;
          return (
            <li key={step.key} aria-current={isCurrent ? 'step' : undefined}
              className={`ankur-order-step ankur-order-step-${step.state} relative flex gap-3 ${last ? '' : 'pb-3'}`}>
              <div className="flex flex-col items-center">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${
                  isCurrent ? 'border-sky-600 bg-sky-600 text-white ring-4 ring-sky-200'
                  : isDone ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-400'}`}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : i + 1}
                </span>
                {!last && <span aria-hidden="true" className={`mt-1 w-1 flex-1 rounded ${isDone ? 'bg-emerald-500' : 'bg-slate-200'}`} style={{ minHeight: '14px' }} />}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={isCurrent ? 'font-black text-sky-800' : isDone ? 'font-bold text-emerald-800' : 'font-semibold text-slate-400'}
                  style={{ fontSize: isCurrent ? '22px' : '20px', lineHeight: 1.25 }}>
                  {hi ? step.hi : step.en}
                </p>
                {time && <p className="text-sm font-semibold text-slate-600">{time}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
