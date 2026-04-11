import { useEffect, useState } from 'react';
import api from '../services/api';

const TeamAccess = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.data || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError(error.response?.data?.error || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, nextRole) => {
    setUpdatingUserId(userId);
    try {
      const res = await api.put(`/auth/users/${userId}/role`, { role: nextRole });
      const updatedUser = res.data.data;
      setError('');
      setUsers((prev) => prev.map((user) => (
        user._id === userId ? { ...user, ...updatedUser } : user
      )));
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update user role');
    } finally {
      setUpdatingUserId('');
    }
  };

  const adminCount = users.filter((user) => user.role === 'admin').length;
  const staffUsers = users.filter((user) => user.role === 'staff');

  return (
    <>
      <section className="hero-card">
        <div className="page-header">
          <div>
            <div className="eyebrow">Access control</div>
            <h1 className="page-title" style={{ marginTop: 8 }}>Promote staff members to admin only when needed.</h1>
            <p className="page-subtitle">New registrations stay as staff by default. Use this page to assign or revoke admin rights for trusted team members.</p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Team members</div>
            <div className="panel-copy">New registrations always start as staff. Promote trusted people to admin only when they need full control of the workspace.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{adminCount} admin</span>
            <span className="badge badge-success">{staffUsers.length} staff</span>
          </div>
        </div>

        {error ? (
          <div className="error-banner" style={{ marginBottom: 18 }}>{error}</div>
        ) : null}

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 260 }}>Loading team access...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">Us</div>
            <div>No users found yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}`}>
                        {user.role === 'admin' ? 'Admin access' : 'Staff access'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`btn ${user.role === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
                          disabled={updatingUserId === user._id || user.role === 'staff'}
                          onClick={() => handleRoleChange(user._id, 'staff')}
                        >
                          Set as Staff
                        </button>
                        <button
                          type="button"
                          className={`btn ${user.role === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
                          disabled={updatingUserId === user._id || user.role === 'admin'}
                          onClick={() => handleRoleChange(user._id, 'admin')}
                        >
                          Grant Admin
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default TeamAccess;
