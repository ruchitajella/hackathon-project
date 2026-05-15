import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const [balances,        setBalances]        = useState([]);
  const [recentRequests,  setRecentRequests]  = useState([]);
  const [pendingCount,    setPendingCount]     = useState(0);
  const [loading,         setLoading]          = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/auth/balances'),
      api.get('/leaves?page=1&page_size=5&sort_by=created_at&order=desc'),
      user.role === 'manager' ? api.get('/manager/requests?status=Pending&page_size=1') : Promise.resolve(null),
    ]).then(([balRes, leavesRes, managerRes]) => {
      setBalances(balRes.data.balances);
      setRecentRequests(leavesRes.data.requests);
      if (managerRes) setPendingCount(managerRes.data.total);
    }).finally(() => setLoading(false));
  }, [user.role]);

  const balanceColors = {
    Vacation: 'bg-blue-50 border-blue-200 text-blue-700',
    Sick:     'bg-green-50 border-green-200 text-green-700',
    Personal: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  const balanceMax = { Vacation: 20, Sick: 10, Personal: 5 };

  if (loading) return <div className="text-gray-400 py-10 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Here's your leave summary</p>
        </div>
        <Link
          to="/my-leaves/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Leave Request
        </Link>
      </div>

      {/* Manager badge */}
      {user.role === 'manager' && pendingCount > 0 && (
        <Link to="/manager/team-leaves?status=Pending">
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-amber-100">
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
            Pending approval{pendingCount > 1 ? 's' : ''} awaiting your decision →
          </div>
        </Link>
      )}

      {/* Leave Balances */}
      <div>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Your Leave Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balances.map(b => {
            const max  = balanceMax[b.leave_type] || 20;
            const pct  = Math.round((b.balance / max) * 100);
            return (
              <div key={b.leave_type} className={`border rounded-xl p-4 ${balanceColors[b.leave_type] || 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">{b.leave_type}</span>
                  <span className="text-xl font-bold">{b.balance}</span>
                </div>
                <div className="w-full bg-white bg-opacity-60 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-current opacity-60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs mt-1 opacity-70">{b.balance} of {max} days remaining</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Recent Requests</h2>
          <Link to="/my-leaves" className="text-indigo-600 text-sm hover:underline">View all →</Link>
        </div>
        {recentRequests.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border text-gray-400">
            No leave requests yet.{' '}
            <Link to="/my-leaves/new" className="text-indigo-600 hover:underline">Submit one now</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Dates</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Days</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentRequests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.leave_type}</td>
                    <td className="px-4 py-3 text-gray-600">{r.start_date} → {r.end_date}</td>
                    <td className="px-4 py-3 text-gray-600">{r.day_count}d</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}