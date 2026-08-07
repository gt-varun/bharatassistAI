import React from 'react';
import { Link } from 'react-router-dom';
import { PageBody } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';

export const NotFoundPage: React.FC = () => (
  <PageBody className="max-w-xl py-24 text-center">
    <p className="register mb-3">Page not found</p>
    <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.02em]">
      There is no page at this address
    </h1>
    <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">
      The link may be out of date. Search the register, or start from a category.
    </p>
    <div className="mt-8 flex justify-center gap-2">
      <Button asChild>
        <Link to="/search">Search schemes</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/categories">Browse categories</Link>
      </Button>
    </div>
  </PageBody>
);
