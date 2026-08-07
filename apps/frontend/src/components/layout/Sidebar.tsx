import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Search,
  LayoutGrid,
  Bookmark,
  ListChecks,
  MessagesSquare,
  UserRound,
  Settings,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { initials, maskPhone } from '../../lib/format';
import { cn } from '../../lib/utils';

interface NavItem {
  /** i18n key under `nav`. */
  labelKey: string;
  to: string;
  icon: LucideIcon;
}

interface NavGroup {
  id: string;
  labelKey: string;
  items: NavItem[];
}

/** Top-level destinations sit above the groups, as on any register index. */
const ROOT_ITEMS: NavItem[] = [{ labelKey: 'home', to: '/dashboard', icon: LayoutDashboard }];

const GROUPS: NavGroup[] = [
  {
    id: 'discover',
    labelKey: 'groupFind',
    items: [
      { labelKey: 'search', to: '/search', icon: Search },
      { labelKey: 'categories', to: '/categories', icon: LayoutGrid },
      { labelKey: 'assistant', to: '/assistant', icon: MessagesSquare }
    ]
  },
  {
    id: 'mine',
    labelKey: 'groupMine',
    items: [
      { labelKey: 'saved', to: '/saved', icon: Bookmark },
      { labelKey: 'documents', to: '/checklist', icon: ListChecks }
    ]
  },
  {
    id: 'account',
    labelKey: 'groupAccount',
    items: [
      { labelKey: 'profile', to: '/profile', icon: UserRound },
      { labelKey: 'settings', to: '/settings', icon: Settings }
    ]
  }
];

const COLLAPSE_KEY = 'bharatassist_rail_collapsed';

interface SidebarProps {
  /** Mobile drawer state, owned by AppShell. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === 'true'
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.id, true]))
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed));
  }, [collapsed]);

  // Navigating on mobile should close the drawer behind you.
  useEffect(() => {
    onCloseMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const accountName = useMemo(() => {
    return user?.email || maskPhone(user?.phone) || t('common.signedIn');
  }, [user, t]);

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const label = t(`nav.${item.labelKey}`);
    const active =
      location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

    return (
      <li key={item.to}>
        <NavLink
          to={item.to}
          title={collapsed ? label : undefined}
          data-active={active || undefined}
          aria-current={active ? 'page' : undefined}
          className={cn('rail-item', collapsed && 'justify-center px-0')}
        >
          <Icon
            className={cn('h-[1.05rem] w-[1.05rem] shrink-0', active ? 'text-sanction' : 'text-ink-3')}
            strokeWidth={1.8}
          />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      </li>
    );
  };

  const rail = (
    <div className="flex h-full flex-col bg-surface">
      {/* Identity block */}
      <div className={cn('flex items-center gap-2.5 px-3 py-3.5', collapsed && 'justify-center px-2')}>
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t("common.appName")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sanction font-display text-[0.9375rem] font-bold text-white shadow-card transition-colors hover:bg-sanction-hover"
        >
          BA
        </button>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[0.9375rem] font-semibold leading-tight text-ink">
              {t('common.appName')}
            </p>
            <p className="register truncate">{t('common.registerSub')}</p>
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label={t("nav.collapse")}
            className="hidden shrink-0 rounded p-1 text-ink-4 transition-colors hover:bg-rule-soft hover:text-ink-2 lg:block"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={t("nav.expand")}
          className="mx-auto mb-1 hidden rounded p-1 text-ink-4 transition-colors hover:bg-rule-soft hover:text-ink-2 lg:block"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}

      {/* Navigation */}
      <nav aria-label={t('nav.primary')} className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">{ROOT_ITEMS.map(renderItem)}</ul>

        {GROUPS.map((group) => (
          <div key={group.id} className="mt-5 first:mt-4">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-rule" role="presentation" />
            ) : (
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={openGroups[group.id]}
                className="mb-1 flex w-full items-center justify-between rounded px-2.5 py-1 text-ink-3 transition-colors hover:text-ink-2"
              >
                <span className="register">{t(`nav.${group.labelKey}`)}</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    !openGroups[group.id] && '-rotate-90'
                  )}
                />
              </button>
            )}

            {(collapsed || openGroups[group.id]) && (
              <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
            )}
          </div>
        ))}
      </nav>

      {/* Account block */}
      {/* Language lives once, in the top bar. */}
      <div className="hair-top p-3">
        <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-indigo-tint font-mono text-[0.75rem] font-semibold text-indigo">
              {initials(user?.email || user?.phone)}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-ink">
                    {accountName}
                  </span>
                  <span className="register block">{t('common.signedIn')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    navigate('/');
                  }}
                  aria-label={t("common.signOut")}
                  className="shrink-0 rounded p-1.5 text-ink-4 transition-colors hover:bg-seal-tint hover:text-seal"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-rule lg:block',
          collapsed ? 'w-[4.25rem]' : 'w-[15.5rem]'
        )}
      >
        <div className="sticky top-0 h-screen">{rail}</div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onCloseMobile}
          className={cn(
            'absolute inset-0 bg-ink/35 transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[16rem] border-r border-rule shadow-pop transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {rail}
        </div>
      </div>
    </>
  );
};
