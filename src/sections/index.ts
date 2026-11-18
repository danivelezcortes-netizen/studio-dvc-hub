import type { ComponentType } from 'react';
import { InspirationSection } from './inspiration/InspirationSection';
import { MetricsSection } from './metrics/MetricsSection';

export type Section = {
  id: string;
  label: string;
  Component: ComponentType;
};

/**
 * To add a section later:
 * 1. Create src/sections/<name>/<Name>Section.tsx
 * 2. Add one entry to this list.
 * The side navigation and the top tabs both read from here.
 */
export const sections: Section[] = [
  { id: 'metrics', label: 'Metrics', Component: MetricsSection },
  { id: 'inspiration', label: 'Inspiration', Component: InspirationSection },
];
