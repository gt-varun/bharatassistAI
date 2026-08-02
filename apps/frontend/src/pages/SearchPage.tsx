import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon,
  Filter,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  ArrowUpDown,
  Building,
  CheckCircle,
  Calendar,
  Layers,
  Globe
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { EmptyState } from '../components/ui/EmptyState';
import { Scheme } from '@bharatassist/shared-types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Query state initialized from URL search params
  const [queryInput, setQueryInput] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [level, setLevel] = useState(searchParams.get('level') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [segment, setSegment] = useState(searchParams.get('segment') || '');
  const [benefitType, setBenefitType] = useState(searchParams.get('benefitType') || '');
  const [incomeBand, setIncomeBand] = useState(searchParams.get('incomeBand') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

  // Mobile Filter Drawer Toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Trending & Popular Queries
  const trendingQueries = [
    'Karnataka Post-Matric Scholarship',
    'PM Kisan 6000 Income Support',
    'PMMY MUDRA Loan 10 Lakh',
    'IGNOAPS Senior Pension'
  ];

  // Recent Searches in localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bharatassist_recent_searches');
      return saved ? JSON.parse(saved) : ['Karnataka scholarship', 'PM Kisan 6000', 'Women business loan'];
    } catch {
      return ['Karnataka scholarship', 'PM Kisan 6000', 'Women business loan'];
    }
  });

  // Debounce free text input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(queryInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [queryInput]);

  // Sync state to URL query params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (level) params.level = level;
    if (state) params.state = state;
    if (segment) params.segment = segment;
    if (benefitType) params.benefitType = benefitType;
    if (incomeBand) params.incomeBand = incomeBand;
    if (status) params.status = status;
    if (sort !== 'relevance') params.sort = sort;
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  }, [debouncedQuery, level, state, segment, benefitType, incomeBand, status, sort, page, setSearchParams]);

  // Save query to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('bharatassist_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== termToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem('bharatassist_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  // Fetch search results from backend API
  const { data, isLoading } = useQuery<{ schemes: Scheme[]; pagination: { total: number; page: number; totalPages: number } }>({
    queryKey: ['searchSchemes', debouncedQuery, level, state, segment, benefitType, incomeBand, status, sort, page],
    queryFn: async () => {
      if (debouncedQuery) saveRecentSearch(debouncedQuery);
      const res = await apiClient.get('/schemes/search', {
        params: {
          q: debouncedQuery || undefined,
          level: level || undefined,
          state: state || undefined,
          segment: segment || undefined,
          benefitType: benefitType || undefined,
          incomeBand: incomeBand || undefined,
          status: status || undefined,
          page,
          limit: 10
        }
      });

      let items: Scheme[] = res.data.data || [];
      if (sort === 'newest') {
        items = [...items].sort((a, b) => new Date(b.lastVerifiedAt).getTime() - new Date(a.lastVerifiedAt).getTime());
      }

      return {
        schemes: items,
        pagination: res.data.pagination || { total: items.length, page: 1, totalPages: 1 }
      };
    }
  });

  const clearAllFilters = () => {
    setQueryInput('');
    setDebouncedQuery('');
    setLevel('');
    setState('');
    setSegment('');
    setBenefitType('');
    setIncomeBand('');
    setStatus('');
    setSort('relevance');
    setPage(1);
  };

  const hasActiveFilters = Boolean(debouncedQuery || level || state || segment || benefitType || incomeBand || status);

  const filterControlsMarkup = (
    <div className="space-y-5">
      {/* Level Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Governance Level</label>
        <Select value={level} onValueChange={(val) => { setLevel(val); setPage(1); }}>
          <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
            <SelectValue placeholder="All Levels (Central & State)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="central">Central Schemes Only</SelectItem>
            <SelectItem value="state">State Schemes Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* State Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">State / Territory</label>
        <Select value={state} onValueChange={(val) => { setState(val); setPage(1); }}>
          <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Karnataka">Karnataka</SelectItem>
            <SelectItem value="Delhi">Delhi</SelectItem>
            <SelectItem value="Maharashtra">Maharashtra</SelectItem>
            <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
            <SelectItem value="Kerala">Kerala</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Segment Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Target Segment</label>
        <Select value={segment} onValueChange={(val) => { setSegment(val); setPage(1); }}>
          <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
            <SelectValue placeholder="All Target Segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="farmer">Farmers</SelectItem>
            <SelectItem value="women">Women</SelectItem>
            <SelectItem value="senior">Senior Citizens</SelectItem>
            <SelectItem value="msme">MSMEs & Business</SelectItem>
            <SelectItem value="pwd">Persons with Disabilities</SelectItem>
            <SelectItem value="jobseeker">Job Seekers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Benefit Type Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Benefit Type</label>
        <Select value={benefitType} onValueChange={(val) => { setBenefitType(val); setPage(1); }}>
          <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
            <SelectValue placeholder="All Benefit Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash Grants & Stipends</SelectItem>
            <SelectItem value="loan">Subsidized Loans</SelectItem>
            <SelectItem value="subsidy">Equipment Subsidies</SelectItem>
            <SelectItem value="certificate">Fee Waivers & Certificates</SelectItem>
            <SelectItem value="service">Public Services</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deadline Status Filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Deadline Status</label>
        <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
          <SelectTrigger className="bg-slate-950 border-slate-800 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open for Applications</SelectItem>
            <SelectItem value="rolling">Rolling Deadline</SelectItem>
            <SelectItem value="closed">Closed / Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8 max-w-7xl mx-auto font-sans">
      {/* Top Bar Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Smart Scheme Search</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search 100+ verified central and state welfare initiatives with natural language support.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="border-slate-800 hover:bg-slate-900 text-slate-200">
          Back to Home
        </Button>
      </header>

      {/* Search Hero Banner & Input Box */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl overflow-hidden">
        <div className="max-w-3xl">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-block mb-3">
            Natural Language Search Engine
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Type what you need in plain, everyday language
          </h2>

          <div className="relative flex items-center mb-4">
            <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. undergraduate scholarship for backward class student in Karnataka..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/60 shadow-inner"
            />
            {queryInput && (
              <button onClick={() => setQueryInput('')} className="absolute right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Trending & Recent Searches */}
          <div className="space-y-2">
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Recent:
                </span>
                {recentSearches.map((term, idx) => (
                  <span
                    key={idx}
                    onClick={() => setQueryInput(term)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 cursor-pointer transition-colors"
                  >
                    {term}
                    <X className="w-3 h-3 text-slate-500 hover:text-red-400" onClick={(e) => removeRecentSearch(term, e)} />
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-slate-400 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Trending:
              </span>
              {trendingQueries.map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => setQueryInput(term)}
                  className="px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[11px] font-medium transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Chips & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(true)}
            className="lg:hidden flex items-center gap-1.5 border-slate-700 text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" /> Filters
          </Button>

          <span className="text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Active Filters:</span>
          {!hasActiveFilters && <span className="text-slate-500 italic">None selected</span>}

          {debouncedQuery && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Query: "{debouncedQuery}" <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setQueryInput('')} />
            </Badge>
          )}
          {level && (
            <Badge variant="secondary" className="bg-slate-800 text-slate-200">
              Level: {level} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setLevel('')} />
            </Badge>
          )}
          {state && (
            <Badge variant="secondary" className="bg-slate-800 text-slate-200">
              State: {state} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setState('')} />
            </Badge>
          )}
          {segment && (
            <Badge variant="secondary" className="bg-slate-800 text-slate-200">
              Segment: {segment} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSegment('')} />
            </Badge>
          )}
          {benefitType && (
            <Badge variant="secondary" className="bg-slate-800 text-slate-200">
              Benefit: {benefitType} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setBenefitType('')} />
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className="bg-slate-800 text-slate-200">
              Status: {status} <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setStatus('')} />
            </Badge>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-300 ml-auto flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Clear All
            </Button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Sort by:</span>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px] bg-slate-950 border-slate-800 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-white">
              <SelectItem value="relevance">Relevance Score</SelectItem>
              <SelectItem value="newest">Latest Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sticky Filters Sidebar */}
        <aside className="hidden lg:block space-y-6 bg-slate-900 p-6 rounded-3xl border border-slate-800 h-fit sticky top-24">
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter Options
            </h3>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-white">
                Reset
              </button>
            )}
          </div>
          {filterControlsMarkup}
        </aside>

        {/* Mobile Filters Drawer Modal */}
        <Modal isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} title="Filter Schemes">
          <div className="py-2">{filterControlsMarkup}</div>
          <Button variant="primary" className="w-full mt-6" onClick={() => setIsMobileFilterOpen(false)}>
            Apply Filters
          </Button>
        </Modal>

        {/* Search Results Display Area */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>
              Showing <strong className="text-white">{data?.schemes.length || 0}</strong> of{' '}
              <strong className="text-white">{data?.pagination.total || 0}</strong> matched schemes
            </span>
            <span>Page {data?.pagination.page || 1} of {data?.pagination.totalPages || 1}</span>
          </div>

          {isLoading ? (
            <LoadingState message="Fetching scheme records from database..." />
          ) : !data?.schemes || data.schemes.length === 0 ? (
            <EmptyState
              title="No matching schemes found"
              description="Try clearing some filters or searching for terms like student, farmer, loan, or senior citizen."
            />
          ) : (
            <div className="space-y-6">
              {data.schemes.map((scheme: Scheme) => (
                <div
                  key={scheme._id || scheme.slug}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-6 sm:p-8 transition-all duration-300 shadow-xl group"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="default" className="bg-amber-500/20 text-amber-300 font-bold uppercase text-[10px]">
                          {scheme.level} {scheme.state ? `• ${scheme.state}` : ''}
                        </Badge>
                        <Badge variant="outline" className="border-slate-700 text-slate-300 uppercase text-[10px]">
                          {scheme.status} Deadline
                        </Badge>
                        {scheme.targetSegments?.map((seg, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-slate-800 text-slate-300 text-[10px] capitalize">
                            {seg}
                          </Badge>
                        ))}
                      </div>

                      <h3
                        onClick={() => navigate(`/schemes/${scheme.slug}`)}
                        className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {scheme.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-amber-400" /> {scheme.department}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/saved')}
                      className="border-slate-800 hover:bg-slate-800 text-slate-300 text-xs shrink-0"
                    >
                      <Bookmark className="w-3.5 h-3.5 mr-1 text-slate-400" /> Save
                    </Button>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed mb-6">{scheme.shortDescription}</p>

                  <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block mb-0.5">Key Benefit</span>
                      <span className="text-sm font-extrabold text-white">{scheme.benefitSummary}</span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/schemes/${scheme.slug}`)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 text-xs shadow-md shadow-amber-500/10 self-end sm:self-center"
                    >
                      View Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-6 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  <span className="text-xs font-semibold text-slate-400">
                    Page {page} of {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 text-xs"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
