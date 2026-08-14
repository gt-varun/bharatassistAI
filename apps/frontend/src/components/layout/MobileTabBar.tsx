import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Search,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface TabItem {
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** Routes that should also light this tab up. */
  alsoMatches?: string[];
}

/**
 * The four journeys a citizen actually repeats, plus a way to everything
 * else. These are the same destinations as the desktop rail's first two
 * groups — not a second, parallel navigation scheme — so a route reached
 * from a tab is the same route reached from the rail.
 *
 * Categories, Documents, Eligibility, Profile and Settings live one tap
 * deeper, behind "More", which opens the very same drawer the rail
 * renders. Nothing is reachable on desktop but unreachable here.
 */
const TABS: TabItem[] = [
  { labelKey: 'nav.home', to: '/dashboard', icon: LayoutDashboard },
  { labelKey: 'nav.search', to: '/search', icon: Search, alsoMatches: ['/categories', '/schemes'] },
  // The rail says "Ask the assistant" — a verb phrase, which is right for a
  // full-width row and far too long for a 75px tab. Tabs get the noun.
  { labelKey: 'nav.tabAssistant', to: '/assistant', icon: MessagesSquare },
  { labelKey: 'nav.saved', to: '/saved', icon: Bookmark, alsoMatches: ['/checklist'] }
];

interface MobileTabBarProps {
  /** Opens the drawer that holds the rest of the rail. */
  onOpenMore: () => void;
  /** True while that drawer is open, so "More" reads as the active tab. */
  moreOpen: boolean;
}

/**
 * Bottom navigation, phones and tablets only — at `lg` the desktop rail
 * takes over and this is not rendered at all.
 *
 * Three things make it feel native rather than like a row of links: it
 * clears the home-indicator strip via the bottom safe-area inset, it gets
 * out of the way when the soft keyboard is up (`hide-on-keyboard`), and
 * every target is a full 44px tall.
 */
export const MobileTabBar: React.FC<MobileTabBarProps> = ({ onOpenMore, moreOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = (tab: TabItem) => {
    if (moreOpen) return false;
    const paths = [tab.to, ...(tab.alsoMatches ?? [])];
    return paths.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const itemClass = (active: boolean) =>
    cn(
      'flex h-full min-h-[2.75rem] flex-col items-center justify-center gap-1 rounded-md px-1 pt-1',
      'text-[0.6875rem] font-medium leading-none transition-colors',
      active ? 'text-sanction' : 'text-ink-3'
    );

  return (
    <nav
      aria-label={t('nav.primary')}
      className="hide-on-keyboard fixed inset-x-0 bottom-0 z-30 border-t border-rule
                 bg-surface/95 pb-safe-b pl-safe-l pr-safe-r backdrop-blur-md lg:hidden"
    >
      <ul className="grid h-[var(--tab-bar-h)] grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <li key={tab.to} className="min-w-0">
              <NavLink
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={itemClass(active)}
              >
                <Icon
                  className="h-[1.3rem] w-[1.3rem] shrink-0"
                  strokeWidth={active ? 2.1 : 1.7}
                />
                <span className="w-full truncate text-center">{t(tab.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}

        <li className="min-w-0">
          <button
            type="button"
            onClick={onOpenMore}
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            className={cn(itemClass(moreOpen), 'w-full')}
          >
            <Menu className="h-[1.3rem] w-[1.3rem] shrink-0" strokeWidth={moreOpen ? 2.1 : 1.7} />
            <span className="w-full truncate text-center">{t('nav.more')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};
