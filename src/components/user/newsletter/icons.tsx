import type { RemixiconComponentType } from '@remixicon/react';
import {
  RiAppleLine,
  RiBankCardLine,
  RiBitCoinLine,
  RiBriefcase4Line,
  RiChargingPile2Line,
  RiChat3Line,
  RiCloudLine,
  RiCpuLine,
  RiFundsLine,
  RiGamepadLine,
  RiHashtag,
  RiHeartPulseLine,
  RiLeafLine,
  RiRobot2Line,
  RiRobotLine,
  RiRocket2Line,
  RiShieldKeyholeLine,
  RiShoppingBag3Line,
  RiStore2Line,
} from '@remixicon/react';

// Icon per newsletter category slug (dev/prod and local DBs use slightly different slugs,
// so both spellings are listed); unknown slugs fall back to a hashtag.
const CATEGORY_ICONS: Record<string, RemixiconComponentType> = {
  'ai-and-deeptech': RiRobot2Line,
  'ai-deeptech': RiRobot2Line,
  business: RiBriefcase4Line,
  'consumer-d2c': RiStore2Line,
  'saas-enterprise': RiCloudLine,
  apple: RiAppleLine,
  'climate-energy': RiLeafLine,
  'cyber-security': RiShieldKeyholeLine,
  'ev-and-mobility': RiChargingPile2Line,
  'ev-mobility': RiChargingPile2Line,
  fintech: RiBankCardLine,
  funding: RiFundsLine,
  'funding-tracker': RiFundsLine,
  gaming: RiGamepadLine,
  healthtech: RiHeartPulseLine,
  robotics: RiRobotLine,
  'social-media': RiChat3Line,
  'space-tech': RiRocket2Line,
  spacetech: RiRocket2Line,
  tech: RiCpuLine,
  'web3-and-blockchain': RiBitCoinLine,
  'web3-blockchain': RiBitCoinLine,
  ecommerce: RiShoppingBag3Line,
};

export function categoryIcon(slug: string): RemixiconComponentType {
  return CATEGORY_ICONS[slug] ?? RiHashtag;
}
