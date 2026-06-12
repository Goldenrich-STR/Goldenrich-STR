import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { 
  Search, RefreshCw, Filter, MapPin, Calendar, Users, 
  AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, BarChart3, Clock
} from 'lucide-react';
import { formatCategoryLabel, formatPropertyTypeLabel, formatDisplayLabel } from '../../lib/displayLabels';

const SearchLogsManagement = () => {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('all'); // all, has_results, no_results
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 15;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        limit: logsPerPage,
        skip: (currentPage - 1) * logsPerPage,
      };
      if (cityFilter.trim()) {
        params.city = cityFilter.trim();
      }
      if (resultFilter === 'has_results') {
        params.has_results = true;
      } else if (resultFilter === 'no_results') {
        params.has_results = false;
      }

      const res = await adminAPI.getSearchLogs(params);
      setLogs(res.data.logs || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch search logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, resultFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchLogs();
    }
  };

  const handleReset = () => {
    setCityFilter('');
    setResultFilter('all');
    setCurrentPage(1);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timestamp;
    }
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-sand-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-black text-charcoal flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-terracotta" />
            <span>Search Analytics & Logs</span>
          </h2>
          <p className="text-charcoal-muted mt-1">
            Analyze customer location searches, identify popular areas, and track searches yielding no properties.
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="px-4 py-2 border-2 border-sand-200 hover:border-sand-400 text-charcoal font-bold rounded-xl transition flex items-center space-x-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[2rem] border border-sand-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search and Filters */}
        <form onSubmit={handleSearchSubmit} className="p-5 border-b border-sand-200 bg-sand-50/50 flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <Search className="w-5 h-5 text-charcoal-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by city/location name..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-white border border-sand-200 outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 text-sm font-bold text-charcoal placeholder:font-semibold placeholder:text-charcoal-light py-3 pl-11 pr-4 rounded-xl transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-white border border-sand-200 rounded-xl px-3 py-1 text-sm font-bold text-charcoal focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20 transition-all">
              <Filter className="w-4 h-4 text-charcoal-muted mr-2" />
              <select
                value={resultFilter}
                onChange={e => {
                  setResultFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none outline-none py-2 cursor-pointer font-bold"
              >
                <option value="all">All Searches</option>
                <option value="has_results">Has Properties Matching</option>
                <option value="no_results">No Properties Found (0 results)</option>
              </select>
            </div>
            <button
              type="submit"
              className="btn-premium px-6 py-2.5 text-sm shrink-0"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 border-2 border-sand-200 text-charcoal-light hover:border-sand-400 font-bold rounded-xl text-sm transition shrink-0"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Logs Table Area */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24 text-charcoal-muted">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-terracotta" />
            <p className="font-bold uppercase tracking-wider text-xs">Fetching Search Analytics...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-24">
            <AlertTriangle className="w-12 h-12 text-sand-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-charcoal mb-2">No Search Logs Found</h3>
            <p className="text-charcoal-muted max-w-md mx-auto">
              {cityFilter ? `No logs matched the location query "${cityFilter}".` : "No landing page searches have been recorded yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sand-50 border-b border-sand-200">
                  <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Location</th>
                  <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Properties Found</th>
                  <th className="px-6 py-4 text-xs font-black text-charcoal uppercase tracking-widest">Search Parameters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {logs.map((log, index) => {
                  const hasZeroResults = log.results_count === 0;
                  return (
                    <tr key={log.search_id || index} className="hover:bg-sand-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-charcoal">
                          <Clock className="w-4 h-4 text-charcoal-light" />
                          <span className="text-sm font-semibold">{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-terracotta shrink-0" />
                          <span className="font-bold text-charcoal text-base">
                            {log.city || <span className="italic text-charcoal-light font-normal">Anywhere</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasZeroResults ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-red-50 text-red-600 border border-red-200 uppercase tracking-wide">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" />
                            0 Results (No Match)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-600 border border-green-200 uppercase tracking-wide">
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-500" />
                            {log.results_count} {log.results_count === 1 ? 'Property' : 'Properties'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {log.category && (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-sand-100 text-charcoal border border-sand-300 rounded">
                              Category: {formatCategoryLabel(log.category)}
                            </span>
                          )}
                          {log.property_type && (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-sand-100 text-charcoal border border-sand-300 rounded">
                              Type: {formatPropertyTypeLabel(log.property_type)}
                            </span>
                          )}
                          {log.bhk_type && (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-sand-100 text-charcoal border border-sand-300 rounded">
                              BHK: {formatDisplayLabel(log.bhk_type)}
                            </span>
                          )}
                          {(log.min_price || log.max_price) ? (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-sand-100 text-charcoal border border-sand-300 rounded">
                              Price: ₹{log.min_price || 0} - {log.max_price ? `₹${log.max_price}` : 'Max'}
                            </span>
                          ) : null}
                          {(log.check_in || log.check_out) ? (
                            <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase bg-sand-100 text-charcoal border border-sand-300 rounded">
                              Dates: {log.check_in ? new Date(log.check_in).toLocaleDateString('en-IN') : 'Any'} to {log.check_out ? new Date(log.check_out).toLocaleDateString('en-IN') : 'Any'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && totalLogs > logsPerPage && (
          <div className="flex justify-between items-center bg-white px-6 py-4 border-t border-sand-200 flex-wrap gap-4 rounded-b-[2rem]">
            <p className="text-xs text-charcoal-muted">
              Showing <span className="font-bold text-charcoal">{(currentPage - 1) * logsPerPage + 1}</span> to{' '}
              <span className="font-bold text-charcoal">
                {Math.min(currentPage * logsPerPage, totalLogs)}
              </span>{' '}
              of <span className="font-bold text-charcoal">{totalLogs}</span> searches logged
            </p>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-sand-200 text-charcoal-light hover:bg-sand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  Math.abs(pageNum - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-colors ${
                        currentPage === pageNum
                          ? 'bg-terracotta text-white font-bold'
                          : 'border border-sand-200 text-charcoal hover:bg-sand-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (
                  pageNum === 2 ||
                  pageNum === totalPages - 1
                ) {
                  return <span key={pageNum} className="text-charcoal-muted px-1">...</span>;
                }
                return null;
              })}
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-sand-200 text-charcoal-light hover:bg-sand-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchLogsManagement;
