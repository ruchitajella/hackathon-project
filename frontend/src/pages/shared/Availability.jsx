import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function Availability() {
  const today  = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const [startDate,    setStartDate]    = useState(today);
  const [endDate,      setEndDate]      = useState(future);
  const [availability, setAvailability] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/availability?start_date=${startDate}&end_date=${endDate}`);
      setAvailability(res.data.availability);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAvailability(); }, []);

  const presets = [
    { label: 'This Week', start: today, end: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] },
    { label: 'Next 30 Days', start: today, end: future },
    { label: 'This Month',
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      end:   new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Team Availability</h1>

      {/* Date Range Picker */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                startDate === p.start && endDate === p.end
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={fetchAvailability}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : availability.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            No approved leave in this date range. 🎉 Everyone is available!
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-gray-50 border-b text-sm text-gray-500">
              {availability.length} approved leave{availability.length !== 1 ? 's' : ''} between {startDate} and {endDate}
            </div>
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Start Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">End Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Days Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {availability.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{a.employee_name}</td>
                    <td className="px-4 py-3 text-gray-600">{a.start_date}</td>
                    <td className="px-4 py-3 text-gray-600">{a.end_date}</td>
                    <td className="px-4 py-3 text-gray-600">{a.day_count}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}