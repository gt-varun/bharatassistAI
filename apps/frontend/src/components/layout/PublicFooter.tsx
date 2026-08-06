import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The footer carries the product's honest limits (PRD §6): this is a
 * register and a guide, not a submission portal.
 */
export const PublicFooter: React.FC = () => (
  <footer className="hair-top bg-surface">
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-sanction font-display text-sm font-bold text-white">
              BA
            </span>
            <span className="font-display text-[0.9375rem] font-semibold text-ink">BharatAssist AI</span>
          </div>
          <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-2">
            A searchable register of central and state government schemes, kept current against
            official notifications.
          </p>
        </div>

        <div>
          <h2 className="register mb-3">On this page</h2>
          <ul className="space-y-2 text-[0.875rem]">
            <li>
              <a href="#who" className="text-ink-2 hover:text-sanction">
                Who it is for
              </a>
            </li>
            <li>
              <a href="#benefits" className="text-ink-2 hover:text-sanction">
                What you get
              </a>
            </li>
            <li>
              <a href="#how" className="text-ink-2 hover:text-sanction">
                How it works
              </a>
            </li>
            <li>
              <a href="#languages" className="text-ink-2 hover:text-sanction">
                Languages
              </a>
            </li>
            <li>
              <a href="#questions" className="text-ink-2 hover:text-sanction">
                Questions
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="register mb-3">Your account</h2>
          <ul className="space-y-2 text-[0.875rem]">
            <li>
              <Link to="/login" className="text-ink-2 hover:text-sanction">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-ink-2 hover:text-sanction">
                Open the register
              </Link>
            </li>
          </ul>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
            Free to use. Your mobile number is only ever used to keep your saved schemes attached
            to you.
          </p>
        </div>

        <div>
          <h2 className="register mb-3">What this is not</h2>
          <p className="text-[0.875rem] leading-relaxed text-ink-2">
            We never accept or submit an application. Once your documents are in order we send you
            to the official government portal, which stays the only place an application is filed.
          </p>
        </div>
      </div>

      <div className="hair-top mt-10 flex flex-wrap items-center justify-between gap-3 pt-6">
        <p className="register">
          Scheme data sourced from official government notifications
        </p>
        <p className="register">© {new Date().getFullYear()} BharatAssist AI</p>
      </div>
    </div>
  </footer>
);
