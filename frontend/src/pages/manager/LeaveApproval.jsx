import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

export default function LeaveApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request,     setRequest]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [acting,      setActing]      = useState(false);

  useEffect(() => {
    api.get(`/leaves/${id}`)
      .then(res => setRequest(res.data.request))
      .catch(() => setError('Request not found or access denied'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDecision = async (action) => {
    setError('');
    setActing(true);
    try {
      await api.patch(`/manager/requests/${id}/${action}`, { manager_note: managerNote });
      navigate('/manager/team-leaves');
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (error && !request) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/manager/team-leaves" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-xl font-bold text-gray-800">Review Request #{request.id}</h1>
        <StatusBadge status={request.status} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Employee</span><p className="font-semibold mt-0.5">{request.requester_name}</p></div>
          <div><span className="text-gray-500">Leave Type</span><p className="font-medium mt-0.5">{request.leave_type}</p></div>
          <div><span className="text-gray-500">Start Date</span><p className="font-medium mt-0.5">{request.start_date}</p></div>
          <div><span className="text-gray-500">End Date</span><p className="font-medium mt-0.5">{request.end_date}</p></div>
          <div><span className="text-gray-500">Duration</span><p className="font-medium mt-0.5">{request.day_count} business days</p></div>
          <div><span className="text-gray-500">Submitted</span><p className="font-medium mt-0.5">{new Date(request.created_at).toLocaleDateString()}</p></div>
        </div>

        {request.reason && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm border">
            <span className="text-gray-500">Employee's Reason: </span>
            <span className="font-medium">{request.reason}</span>
          </div>
        )}

        {request.status === 'Pending' && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add a note for the employee..."
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision('approve')}
                disabled={acting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {acting ? 'Processing...' : '✓ Approve'}
              </button>
              <button
                onClick={() => handleDecision('reject')}
                disabled={acting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {acting ? 'Processing...' : '✗ Reject'}
              </button>
            </div>
          </div>
        )}

        {request.status !== 'Pending' && request.decided_at && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm border">
            <p className="font-medium text-gray-600 mb-1">Decision Record</p>
            <p>Status: <strong>{request.status}</strong></p>
            {request.manager_note && <p className="mt-1">Note: <em>"{request.manager_note}"</em></p>}
            <p className="text-gray-400 mt-1">Decided on {new Date(request.decided_at).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}