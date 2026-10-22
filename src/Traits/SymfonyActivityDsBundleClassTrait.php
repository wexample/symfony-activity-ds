<?php

namespace Wexample\SymfonyActivityDs\Traits;

use Wexample\SymfonyActivityDs\WexampleSymfonyActivityDsBundle;
use Wexample\SymfonyHelpers\Traits\BundleClassTrait;

trait SymfonyActivityDsBundleClassTrait
{
    use BundleClassTrait;

    public static function getBundleClassName(): string
    {
        return WexampleSymfonyActivityDsBundle::class;
    }
}
