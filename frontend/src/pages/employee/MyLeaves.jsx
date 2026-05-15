import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

const LEAVE_TYPES = ['Vacation', 'Sick', 'Personal'];
const STATUSES    = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

export default function MyLeaves() {
  const [requests, setRequests] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);

  const [filters, setFilters] = useState({
    status: '', leave_type: '', sort_by: 'created_at', order: 'desc', page: 1,
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, page_size: 10 });
      Object.keys(filters).forEach(k => !filters[k] && params.delete(k));
      const res = await api.get(`/leaves?${params}`);
      setRequests(res.data.requests);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const totalPages = Math.ceil(total / 10);

  const handleWithdraw = async (id) => {
    if (!window.confirm('Withdraw this request?')) return;
    try {
      await api.patch(`/leaves/${id}/withdraw`);
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to withdraw');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">My Leave Requests</h1>
        <Link
          to="/my-leaves/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
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
          onClick={() => setFilters({ status: '', leave_type: '', sort_by: 'created_at', order: 'desc', page: 1 })}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            No requests found.{' '}
            <Link to="/my-leaves/new" className="text-indigo-600 hover:underline">Submit one</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">ID</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Start</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">End</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Days</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">#{r.id}</td>
                  <td className="px-4 py-3 font-medium">{r.leave_type}</td>
                  <td className="px-4 py-3 text-gray-600">{r.start_date}</td>
                  <td className="px-4 py-3 text-gray-600">{r.end_date}</td>
                  <td className="px-4 py-3 text-gray-600">{r.day_count}d</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      to={`/my-leaves/${r.id}`}
                      className="text-indigo-600 hover:underline text-xs"
                    >
                      View
                    </Link>
                    {r.status === 'Pending' && (
                      <button
                        onClick={() => handleWithdraw(r.id)}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Withdraw
                      </button>
                    )}
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
          <span>Showing page {filters.page} of {totalPages} ({total} total)</span>
          <div className="flex gap-2">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              ← Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setFilters(f => ({ ...f, page: i + 1 }))}
                className={`px-3 py-1 border rounded ${filters.page === i + 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={filters.page === totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}