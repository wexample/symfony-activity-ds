<?php

namespace Wexample\SymfonyActivityDs\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('wexample_symfony_activity_ds');

        $treeBuilder->getRootNode()
            ->children()
                ->arrayNode('journal')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->scalarNode('page_role')
                            ->info('The role reading the journal of every subject at /activity, `ROLE_ADMIN`. Unset, the page answers 404: what everyone did is shown to nobody until the application says to whom.')
                            ->defaultNull()
                        ->end()
                    ->end()
                ->end()
            ->end();

        return $treeBuilder;
    }
}
