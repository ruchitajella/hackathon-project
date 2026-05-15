import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';

export default function LeaveDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState('');
  const [editing, setEditing]   = useState(false);
  const [form,    setForm]      = useState({});

  const fetchRequest = async () => {
    try {
      const res = await api.get(`/leaves/${id}`);
      setRequest(res.data.request);
      setForm({
        leave_type: res.data.request.leave_type,
        start_date: res.data.request.start_date,
        end_date:   res.data.request.end_date,
        reason:     res.data.request.reason || '',
      });
    } catch {
      setError('Request not found or access denied');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequest(); }, [id]);

  const isOwner   = request?.user_id === user.id;
  const canEdit   = isOwner && request?.status === 'Pending';
  const canCancel = isOwner && request?.status === 'Approved' &&
    new Date(request?.start_date) > new Date();

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/leaves/${id}`, form);
      setEditing(false);
      fetchRequest();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this approved leave? Your balance will be restored.')) return;
    try {
      await api.patch(`/leaves/${id}/cancel`);
      navigate('/my-leaves');
    } catch (err) {
      setError(err.response?.data?.error || 'Cancellation failed');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Loading...</div>;
  if (error && !request) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/my-leaves" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-xl font-bold text-gray-800">Leave Request #{request.id}</h1>
        <StatusBadge status={request.status} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!editing ? (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Leave Type</span><p className="font-medium mt-0.5">{request.leave_type}</p></div>
            <div><span className="text-gray-500">Day Count</span><p className="font-medium mt-0.5">{request.day_count} business days</p></div>
            <div><span className="text-gray-500">Start Date</span><p className="font-medium mt-0.5">{request.start_date}</p></div>
            <div><span className="text-gray-500">End Date</span><p className="font-medium mt-0.5">{request.end_date}</p></div>
            <div><span className="text-gray-500">Submitted</span><p className="font-medium mt-0.5">{new Date(request.created_at).toLocaleDateString()}</p></div>
            <div><span className="text-gray-500">Status</span><p className="mt-0.5"><StatusBadge status={request.status} /></p></div>
          </div>

          {request.reason && (
            <div className="text-sm">
              <span className="text-gray-500">Reason</span>
              <p className="font-medium mt-0.5">{request.reason}</p>
            </div>
          )}

          {(request.decided_at) && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1 border">
              <p className="text-gray-500 font-medium">Manager Decision</p>
              <p>Status: <strong>{request.status}</strong></p>
              {request.manager_note && <p>Note: <em>"{request.manager_note}"</em></p>}
              <p className="text-gray-400">Decided on {new Date(request.decided_at).toLocaleDateString()}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {canEdit && (
              <button
                onClick={() => setEditing(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Edit Request
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancel}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel Leave
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Edit Request</h2>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.leave_type}
                onChange={e => setForm({ ...form, leave_type: e.target.value })}
              >
                {['Vacation','Sick','Personal'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Changes</button>
              <button type="button" onClick={() => setEditing(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}