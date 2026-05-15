import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'];
const STATUSES    = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

export default function TeamLeaves() {
  const [searchParams] = useSearchParams();
  const [requests,  setRequests]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [filters,   setFilters]   = useState({
    status:     searchParams.get('status') || '',
    leave_type: '',
    search:     '',
    sort_by:    'created_at',
    order:      'desc',
    page:       1,
  });

  const fetchTeamLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, page_size: 10 });
      Object.keys(filters).forEach(k => !filters[k] && params.delete(k));
      const res = await api.get(`/manager/requests?${params}`);
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTeamLeaves(); }, [fetchTeamLeaves]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Team Leave Requests</h1>
        <span className="text-sm text-gray-500">{total} total request{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48"
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={filters.leave_type}
          onChange={e => setFilters({ ...filters, leave_type: e.target.value, page: 1 })}
        >
          <option value="">All Types</option>
          {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          value={`${filters.sort_by}_${filters.order}`}
          onChange={e => {
            const [sort_by, order] = e.target.value.split('_');
            setFilters({ ...filters, sort_by, order, page: 1 });
          }}
        >
          <option value="created_at_desc">Newest First</option>
          <option value="created_at_asc">Oldest First</option>
          <option value="start_date_asc">Start Date ↑</option>
          <option value="start_date_desc">Start Date ↓</option>
          <option value="status_asc">Status A-Z</option>
        </select>
        <button
          onClick={() => setFilters({ status: '', leave_type: '', search: '', sort_by: 'created_at', order: 'desc', page: 1 })}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No requests found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Employee</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Dates</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Days</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">#{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.requester_name}</td>
                  <td className="px-4 py-3">{r.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.start_date} → {r.end_date}</td>
                  <td className="px-4 py-3 text-gray-600">{r.day_count}d</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/manager/team-leaves/${r.id}`}
                      className="text-indigo-600 hover:underline text-xs font-medium"
                    >
                      {r.status === 'Pending' ? 'Review →' : 'View →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {filters.page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >← Prev</button>
            <button
              disabled={filters.page === totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}