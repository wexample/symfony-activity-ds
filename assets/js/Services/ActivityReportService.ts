import AppService from '@wexample/symfony-loader/js/Class/AppService';
import EventsService from '@wexample/symfony-loader/js/Services/EventsService';
import ErrorService, { ErrorPayload, ErrorServiceEvents } from '@wexample/symfony-loader/js/Services/ErrorService';
import { FORM_ABANDONED, FORM_INVALID, FORM_OPENED } from '@wexample/symfony-loader/js/Constants/FormEvents';
import { stringHash } from '@wexample/js-helpers/Helper/String';

type ActivityReportEntry = {
  category: string;
  type: string;
  context: Record<string, string | number | boolean | null>;
  fingerprint?: string;
};

// What symfony-activity routes and bounds: one batch at most this long.
const ACTIVITY_REPORT_PATH = '/_activity/report';
const ACTIVITY_REPORT_BATCH = 20;
const ACTIVITY_REPORT_HEADER_CATEGORIES = 'X-Activity-Categories';
// What a form goes through, reported as `ui.form.<what>`.
const ACTIVITY_REPORT_FORM_EVENTS: Record<string, string> = {
  [FORM_OPENED]: 'ui.form.opened',
  [FORM_INVALID]: 'ui.form.invalid',
  [FORM_ABANDONED]: 'ui.form.abandoned',
};
// Entries gathered for this long are sent together.
const ACTIVITY_REPORT_DELAY = 2000;
const ACTIVITY_REPORT_STACK_LENGTH = 1000;

/**
 * Reports to symfony-activity what happens in the browser: every error the
 * ErrorService captures, in the `client` category, and in `ui` what the
 * forms go through and what the interface tells through track(). An
 * application lists it in its services.
 *
 * Entries are batched, sent with keepalive so that the last ones leave with
 * the page. An error is reported once per page however often it repeats,
 * the server counting repeats across pages; what the interface tells is
 * sent each time, with a fingerprint the server can merge it by. The server answers
 * which categories it still records; the others stop being sent.
 */
export default class ActivityReportService extends AppService {
  public static serviceName: string = 'activityReport';
  public static dependencies: typeof AppService[] = [EventsService, ErrorService];

  public static CATEGORY_CLIENT: string = 'client';
  public static CATEGORY_UI: string = 'ui';

  private queue: ActivityReportEntry[] = [];
  // The errors reported from this page already.
  private reported = new Set<string>();
  // Unknown until the first answer: everything is sent until then.
  private recorded: Set<string> | null = null;
  private timer?: number;
  // The page is going: what is told now — a form abandoned on its own
  // pagehide, heard after this one's — leaves at once or never.
  private leaving = false;

  registerHooks() {
    return {
      app: {
        hookInit: () => {
          this.app.services.events.listen(ErrorServiceEvents.CAPTURED, this.onErrorCaptured);
          this.app.services.events.listen(Object.keys(ACTIVITY_REPORT_FORM_EVENTS), this.onFormEvent);
          window.addEventListener('pagehide', this.onPageHide);
          // Back from the back-forward cache: the page lives again.
          window.addEventListener('pageshow', () => {
            this.leaving = false;
          });
        },
      },
    };
  }

  /**
   * Tells something the interface saw — `ui.form.abandoned` —, in `ui`.
   */
  track(type: string, context: ActivityReportEntry['context'] = {}, fingerprint?: string): void {
    this.add({ category: ActivityReportService.CATEGORY_UI, type, context, fingerprint });
  }

  private onFormEvent = (event: CustomEvent<{ form: string; fields?: string[] }>): void => {
    const type = ACTIVITY_REPORT_FORM_EVENTS[event.type];
    const context: ActivityReportEntry['context'] = {
      form: event.detail.form,
      page: window.location.pathname,
    };

    if (event.detail.fields) {
      context.fields = event.detail.fields.join(',');
    }

    this.track(type, context, stringHash(`${type}|${event.detail.form}`));
  };

  private onErrorCaptured = (event: CustomEvent<ErrorPayload>): void => {
    const payload = event.detail;
    const details = (payload.context.details ?? {}) as Record<string, unknown>;
    const stack = typeof payload.logPayload.stack === 'string' ? payload.logPayload.stack : null;
    // Where it was thrown names an error better than its message, which may
    // carry an id; an inline script has no file, and its message is kept.
    const where = details.filename
      ? `${details.filename}:${details.lineno}:${details.colno}`
      : `${details.lineno ?? ''}:${details.colno ?? ''}|${payload.message}`;

    this.add({
      category: ActivityReportService.CATEGORY_CLIENT,
      type: `client.${payload.severity}`,
      context: {
        message: payload.message,
        title: payload.title ?? null,
        source: payload.context.source ?? null,
        kind: payload.context.kind ?? null,
        code: payload.context.code ?? null,
        file: (details.filename as string | undefined) ?? null,
        line: (details.lineno as number | undefined) ?? null,
        column: (details.colno as number | undefined) ?? null,
        page: window.location.pathname,
        stack: stack ? stack.slice(0, ACTIVITY_REPORT_STACK_LENGTH) : null,
      },
      fingerprint: stringHash(`${payload.severity}|${where}`),
    });
  };

  private add(entry: ActivityReportEntry): void {
    if (this.recorded && !this.recorded.has(entry.category)) {
      return;
    }

    if (entry.category === ActivityReportService.CATEGORY_CLIENT && entry.fingerprint) {
      if (this.reported.has(entry.fingerprint)) {
        return;
      }
      this.reported.add(entry.fingerprint);
    }

    this.queue.push(entry);

    if (this.leaving || this.queue.length >= ACTIVITY_REPORT_BATCH) {
      this.flush();
    } else if (this.timer === undefined) {
      this.timer = window.setTimeout(this.flush, ACTIVITY_REPORT_DELAY);
    }
  }

  private onPageHide = (): void => {
    this.leaving = true;
    this.flush();
  };

  private flush = (): void => {
    window.clearTimeout(this.timer);
    this.timer = undefined;

    while (this.queue.length) {
      this.send(this.queue.splice(0, ACTIVITY_REPORT_BATCH));
    }
  };

  private send(entries: ActivityReportEntry[]): void {
    fetch(ACTIVITY_REPORT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
      keepalive: true,
    })
      .then((response) => {
        const categories = response.headers.get(ACTIVITY_REPORT_HEADER_CATEGORIES);

        if (categories !== null) {
          this.recorded = new Set(categories.split(',').filter(Boolean));
        }
      })
      // A report that cannot leave is not reported in turn: that would be
      // an error about reporting errors, sent the way that just failed.
      .catch(() => undefined);
  }
}
