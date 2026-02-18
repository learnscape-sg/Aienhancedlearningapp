/**
 * Type utilities for the application
 */

import React from 'react';

export type MarkdownComponentProps<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithoutRef<T>;
