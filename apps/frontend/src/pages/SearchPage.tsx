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
  Clock
} from 'lucide-react';
import { apiClient } from '../api/client.js';
import { Card } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.js';
import { Badge } from '../components/ui/badge.js';
import { LoadingState } from '../components/ui/LoadingState.js';
import { EmptyState } from '../components/ui/EmptyState.js';
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
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));

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
    }, 400);
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
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  }, [debouncedQuery, level, state, segment, benefitType, incomeBand, status, page, setSearchParams]);

  // Save query to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('bharatassist_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  // Fetch search results from backend API
  const { data, isLoading } = useQuery<{ schemes: Scheme[]; pagination: { total: number; page: number; totalPages: number } }>({
    queryKey: ['searchSchemes', debouncedQuery, level, state, segment, benefitType, incomeBand, status, page],
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
      return {
        schemes: res.data.data,
        pagination: res.data.pagination || { total: res.data.data.length, page: 1, totalPages: 1 }
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
    setPage(1);
  };

  const hasActiveFilters = Boolean(debouncedQuery || level || state || segment || benefitType || incomeBand || status);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Smart Scheme Search</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search in natural language or filter central and state welfare initiatives.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>Home</Button>
      </header>

      {/* Main Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl">
        <div className="relative flex items-center mb-3">
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by keyword or natural text (e.g. undergraduate scholarship in Karnataka)..."
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-10 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
          />
          {queryInput && (
            <button onClick={() => setQueryInput('')} className="absolute right-4 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions & Recent Searches */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Suggestions:
          </span>
          {recentSearches.map((term, idx) => (
            <button
              key={idx}
              onClick={() => setQueryInput(term)}
              className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-700/60 transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Active Filters:</span>
          {debouncedQuery && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Query: "{debouncedQuery}" <X className="w-3 h-3 cursor-pointer" onClick={() => setQueryInput('')} />
            </Badge>
          )}
          {level && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Level: {level} <X className="w-3 h-3 cursor-pointer" onClick={() => setLevel('')} />
            </Badge>
          )}
          {state && (
            <Badge variant="secondary" className="flex items-center gap-1">
              State: {state} <X className="w-3 h-3 cursor-pointer" onClick={() => setState('')} />
            </Badge>
          )}
          {segment && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Segment: {segment} <X className="w-3 h-3 cursor-pointer" onClick={() => setSegment('')} />
            </Badge>
          )}
          {benefitType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Benefit: {benefitType} <X className="w-3 h-3 cursor-pointer" onClick={() => setBenefitType('')} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-red-400 hover:text-red-300 ml-auto flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Clear All
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="space-y-5 bg-slate-900 p-5 rounded-2xl border border-slate-800 h-fit">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filter Schemes
            </h2>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-white">
                Reset
              </button>
            )}
          </div>

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

          {/* Status Filter */}
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
        </aside>

        {/* Search Results Area */}
        <main className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>
              Showing <strong className="text-white">{data?.schemes.length || 0}</strong> of{' '}
              <strong className="text-white">{data?.pagination.total || 0}</strong> matched schemes
            </span>
            <span>Page {data?.pagination.page || 1} of {data?.pagination.totalPages || 1}</span>
          </div>

          {isLoading ? (
            <LoadingState message="Searching government scheme records..." />
          ) : !data?.schemes || data.schemes.length === 0 ? (
            <EmptyState
              title="No schemes matched your criteria"
              description="Try broadening your query, removing specific filters, or searching by category."
            />
          ) : (
            <div className="space-y-5">
              {data.schemes.map((scheme: Scheme) => (
                <Card
                  key={scheme._id || scheme.slug}
                  className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors p-6"
                >
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase tracking-wider">
                          {scheme.level} {scheme.state ? `• ${scheme.state}` : ''}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                          {scheme.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white hover:text-amber-400 transition-colors cursor-pointer" onClick={() => navigate(`/schemes/${scheme.slug}`)}>
                        {scheme.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{scheme.department}</p>
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

                  <p className="text-sm text-slate-300 leading-relaxed mb-4">{scheme.shortDescription}</p>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider block">Key Benefit</span>
                      <span className="text-sm font-bold text-white">{scheme.benefitSummary}</span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/schemes/${scheme.slug}`)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 self-end sm:self-center"
                    >
                      View Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </Card>
              ))}

              {/* Pagination Controls */}
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
