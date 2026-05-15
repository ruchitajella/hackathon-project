export default function StatusBadge({ status }) {
  const styles = {
    Pending:   'bg-yellow-100 text-yellow-800',
    Approved:  'bg-green-100  text-green-800',
    Rejected:  'bg-red-100    text-red-800',
    Cancelled: 'bg-gray-100   text-gray-600',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100'}`}>
      {status}
    </span>
  );
}