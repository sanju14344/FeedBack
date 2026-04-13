import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { UserPlus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { getCRs, approveCR, rejectCR } from '../api';
import './AdminMasterDashboard.css';

export default function AdminMasterDashboard({ theme, toggleTheme }) {
  const [crs, setCrs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCRs = async () => {
    try {
      setLoading(true);
      const res = await getCRs();
      setCrs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRs();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveCR(id);
      fetchCRs();
    } catch (e) {
      alert("Failed to approve");
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("Are you sure you want to reject and delete this CR request?")) {
      try {
        await rejectCR(id);
        fetchCRs();
      } catch (e) {
        alert("Failed to reject");
      }
    }
  };

  return (
    <div className="page-wrapper admin-wrapper">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        userText="🛡️ Master Admin" 
        onLogout={() => window.location.href = '/'} 
      />

      <main className="dashboard-main">
        <div className="admin-header-row">
          <div>
            <h2 className="section-title">Class Representatives Management</h2>
            <p className="admin-subtitle">Approve new CRs, edit details, or remove access.</p>
          </div>
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={fetchCRs}>Refresh List</Button>
        </div>

        <GlassCard className="table-card">
          <div className="table-responsive">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-4 text-muted">Loading...</td></tr>
                ) : crs.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-4 text-muted">No Class Representatives found.</td></tr>
                ) : crs.map(cr => (
                  <tr key={cr.id}>
                    <td>
                      <div className="fw-500">{cr.full_name}</div>
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>{cr.email}</div>
                    </td>
                    <td>
                      <span className="badge-dept">{cr.department}</span>
                      <div className="text-muted" style={{fontSize: '0.8rem'}}>{cr.year} Year</div>
                    </td>
                    <td>
                      {cr.is_approved ? (
                        <span style={{color: 'var(--success)', fontWeight:'600', fontSize:'0.85rem'}}>✅ Approved</span>
                      ) : (
                        <span style={{color: 'var(--warning)', fontWeight:'600', fontSize:'0.85rem'}}>⏳ Pending</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      {!cr.is_approved ? (
                        <>
                          <button className="icon-btn text-success" onClick={() => handleApprove(cr.id)} title="Approve"><CheckCircle size={18} /></button>
                          <button className="icon-btn text-error" onClick={() => handleReject(cr.id)} title="Reject"><XCircle size={18} /></button>
                        </>
                      ) : (
                         <button className="icon-btn text-error" onClick={() => handleReject(cr.id)} title="Revoke Access"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </main>
    </div>
  );
}
