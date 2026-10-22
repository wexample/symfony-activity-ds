<?php

namespace Wexample\SymfonyActivityDs\Controller\Pages;

use DateTimeImmutable;
use DateTimeZone;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Wexample\SymfonyActivity\Class\ActivityJournalFilter;
use Wexample\SymfonyActivity\Class\ActivitySubject;
use Wexample\SymfonyActivity\Service\ActivityJournalService;
use Wexample\SymfonyActivity\Service\ActivitySubjectService;
use Wexample\SymfonyActivityDs\Traits\SymfonyActivityDsBundleClassTrait;
use Wexample\SymfonyLoader\Controller\AbstractPagesController;

/**
 * Everything logged about the application, every subject together: the
 * events and the field changes, newest first, narrowed by category, type,
 * period and who did it. Absent where the application declared no
 * `journal.page_role` — the page answers 404 —, refused to whoever lacks it.
 *
 * Who did it comes from a link of the table itself: an actor is chosen by
 * pressing their name, never typed.
 */
#[Route(path: '/activity')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
final class JournalController extends AbstractPagesController
{
    use SymfonyActivityDsBundleClassTrait;

    public const string ROUTE = 'activity_journal';

    /** The periods offered, as far back as each reaches. */
    public const array PERIODS = [
        'day' => '-1 day',
        'week' => '-7 days',
        'month' => '-1 month',
        'year' => '-1 year',
    ];

    private const int PER_PAGE = 50;

    #[Route(path: '', name: self::ROUTE, methods: [Request::METHOD_GET])]
    public function index(
        Request $request,
        ActivityJournalService $journal,
        ActivitySubjectService $subjects,
        #[Autowire(param: 'wexample_symfony_activity_ds.journal.page_role')]
        ?string $pageRole = null,
    ): Response {
        if (! $pageRole) {
            throw $this->createNotFoundException();
        }

        $this->denyAccessUnlessGranted($pageRole);

        $query = $request->query;
        $actor = $query->getString('actor_type') !== '' && $query->getString('actor_id') !== ''
            ? new ActivitySubject($query->getString('actor_type'), $query->getString('actor_id'))
            : null;

        // A value the journal does not hold narrows to nothing it could show:
        // dropped rather than answered with an empty page.
        $categories = $journal->findCategories(new ActivityJournalFilter(actor: $actor));
        $category = in_array($query->getString('category'), $categories, true) ? $query->getString('category') : null;
        $types = $journal->findTypes(new ActivityJournalFilter(category: $category, actor: $actor));
        $type = in_array($query->getString('type'), $types, true) ? $query->getString('type') : null;
        $period = array_key_exists($query->getString('period'), self::PERIODS) ? $query->getString('period') : null;
        $page = max(1, $query->getInt('page', 1));

        return $this->renderPage('index', [
            'categories' => $categories,
            'types' => $types,
            'periods' => array_keys(self::PERIODS),
            'actor' => $actor ? ['label' => $subjects->label($actor->type, $actor->id)] : null,
            'page' => $page,
            ...$journal->paginate(new ActivityJournalFilter(
                category: $category,
                type: $type,
                actor: $actor,
                from: $period ? new DateTimeImmutable(self::PERIODS[$period], new DateTimeZone('UTC')) : null,
            ), $page, self::PER_PAGE),
        ]);
    }
}
