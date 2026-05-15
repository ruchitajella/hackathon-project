import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-indigo-700 text-white px-6 py-3 flex items-center justify-between shadow">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-lg tracking-tight">LeaveManager</Link>

        {/* Only employees see My Leaves */}
        {user?.role === 'employee' && (
          <Link to="/my-leaves" className="text-sm hover:text-indigo-200">My Leaves</Link>
        )}

        <Link to="/availability" className="text-sm hover:text-indigo-200">Team Availability</Link>

        {user?.role === 'manager' && (
          <Link to="/manager/team-leaves" className="text-sm hover:text-indigo-200">
            Team Requests
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-indigo-200">
          {user?.name} ({user?.role})
        </span>
        <button
          onClick={handleLogout}
          className="text-sm bg-indigo-800 hover:bg-indigo-900 px-3 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}