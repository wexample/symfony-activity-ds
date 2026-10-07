<?php

namespace Wexample\SymfonyActivityDs\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Wexample\SymfonyHelpers\DependencyInjection\AbstractWexampleSymfonyExtension;

class WexampleSymfonyActivityDsExtension extends AbstractWexampleSymfonyExtension
{
    public function load(
        array $configs,
        ContainerBuilder $container
    ): void {
        $config = $this->processConfiguration(new Configuration(), $configs);

        $container->setParameter('wexample_symfony_activity_ds.journal.page_role', $config['journal']['page_role']);

        $this->loadConfig(
            __DIR__,
            $container
        );
    }
}
