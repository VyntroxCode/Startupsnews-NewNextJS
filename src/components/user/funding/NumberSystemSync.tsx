'use client';

import { setNumberSystem, type NumberSystem } from '@/modules/funding-deals/utils/format';

/**
 * Applies the admin's saved number system (Lakh/Crore or Million/Billion) before any Funding page
 * below it renders, so every `formatUsdMn` call on the page uses it. Set during render (not in an
 * effect) because children render after this component and must see it on their first paint.
 */
export default function NumberSystemSync({ system, children }: { system: NumberSystem; children: React.ReactNode }) {
  setNumberSystem(system);
  return <>{children}</>;
}
