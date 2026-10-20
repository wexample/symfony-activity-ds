# symfony-activity-ds

Version: 2.0.5

## The journal

`/activity` (`activity_journal`) is everything symfony-activity logs, every subject together: the events and the field changes auditor records, newest first, fifty to a page. Its bar filters by category, by type and by period — the last day, week, month or year —, kept in the address. Who did it is a column whose names are links: pressing one narrows the journal to what that person did, shown above the table with the way back to everyone. A change knows its author by id only and links to nothing.

It is shown to nobody until the application names the role reading it; without one, the page answers 404:

```yaml
# config/packages/wexample_symfony_activity_ds.yaml
wexample_symfony_activity_ds:
    journal:
        page_role: ROLE_ADMIN
```

auditor's own viewer stays off: it reads the changes alone, entity by entity, in a layout of its own. The journal reads them with the events, in the application's.

## Partials

Two ways of drawing a history read by symfony-activity, to include in a page of the application:

```twig
{# The last entries, newest first, as a timeline, with the way to the rest. #}
{% include '@WexampleSymfonyActivityDsBundle/partials/recent.html.twig' with {
    entries: activity_repository.findRecent(subject, 10),
    more_href: path('history_page'),
} %}

{# One page of it as a table, and its pages: the array ActivityRepository::paginate() returns, with the current page. #}
{% include '@WexampleSymfonyActivityDsBundle/partials/table.html.twig' with {
    entries: found.entries, page: page, pages_count: found.pages_count,
} %}
```

Each entry shows its category, its type code and its time, and how many times it happened when symfony-activity merged its repeats. An event shows its context as recorded, and says when someone else than the subject did it; a change lists the fields it touched, `old → new` — `partials/changes.html.twig`, plain lines needing no style. A failure, a refusal, a denial, an expiry, an error or a limit exceeded is drawn in the danger tone.

The table takes `journal: true` for the journal's two more columns, who did it and what it was about, and `filters` for its bar, as `data_table()` takes them. The page including them imports the styles of the `timeline`, `data-table`, `filter-bar`, `pagination` and `marker` components.

The account pages of symfony-user-ds use both: the recent block on `/accounts/{id}`, the table on `/accounts/{id}/activity` — the changes made to an audited account among the rest.

## What the browser reports

`js/Services/ActivityReportService` sends symfony-activity what happens in the browser, to `POST /_activity/report`:

- `client` — every error the loader's `ErrorService` captures, uncaught ones included, as `client.<severity>` with its message, where it was thrown, the page and the start of its stack. An error is sent once per page however often it repeats; its fingerprint, where it was thrown, lets the server count it across pages.
- `ui` — what the forms of the loader go through, `ui.form.opened`, `ui.form.invalid` with the fields the server refused, `ui.form.abandoned` when changed then left unsent; and whatever a script tells through `track()`:

```ts
(this.app.services.activityReport as ActivityReportService).track('ui.tour.skipped', { step: 3 });
```

An application lists the service with its own:

```ts
import ActivityReportService from '@wexample/symfony-activity-ds/js/Services/ActivityReportService';

getServices() {
  return [...super.getServices(), ActivityReportService];
}
```

and opens the categories on the server side — `client_categories`, and each enabled under `categories` (symfony-activity's usage page). Entries leave in batches, the last ones with the page as it goes. The server answers which categories it still records, and the others stop being sent.

## Table of Contents

- [The journal](#the-journal)
- [Partials](#partials)
- [What the browser reports](#what-the-browser-reports)
- [Integration in the Suite](#integration-in-the-suite)
- [Dependencies](#dependencies)
- [Versioning & Compatibility Policy](#versioning--compatibility-policy)
- [License](#license)
- [About us](#about-us)
- [Migration Notes](#migration-notes)

## Integration in the Suite

This package is part of the Wexample Suite — a collection of high-quality, modular tools designed to work seamlessly together across multiple languages and environments.

### Related Packages

The suite includes packages for configuration management, file handling, prompts, and more. Each package can be used independently or as part of the integrated suite.

## Dependencies

- php: >=8.5
- wexample/symfony-activity: >=3.0.0
- wexample/symfony-design-system: >=37.0.0
- wexample/symfony-helpers: >=17.0.0
- wexample/symfony-loader: >=23.2.0

## Versioning & Compatibility Policy

Wexample packages follow **Semantic Versioning** (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

We maintain backward compatibility within major versions and provide clear migration guides for breaking changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Free to use in both personal and commercial projects.

## About us

[Wexample](https://wexample.com) stands as a cornerstone of the digital ecosystem — a collective of seasoned engineers, researchers, and creators driven by a relentless pursuit of technological excellence. More than a media platform, it has grown into a vibrant community where innovation meets craftsmanship, and where every line of code reflects a commitment to clarity, durability, and shared intelligence.

This packages suite embodies this spirit. Trusted by professionals and enthusiasts alike, it delivers a consistent, high-quality foundation for modern development — open, elegant, and battle-tested. Its reputation is built on years of collaboration, refinement, and rigorous attention to detail, making it a natural choice for those who demand both robustness and beauty in their tools.

Wexample cultivates a culture of mastery. Each package, each contribution carries the mark of a community that values precision, ethics, and innovation — a community proud to shape the future of digital craftsmanship.

Built and maintained by [Romain Weeger](https://weeger.io).

## Migration Notes

When upgrading between major versions, refer to the migration guides in the documentation.

Breaking changes are clearly documented with upgrade paths and examples.
