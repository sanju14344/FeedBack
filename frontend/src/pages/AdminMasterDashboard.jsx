import React, { useState } from 'react';
import Header from '../components/Header';
import GlassCard from '../components/GlassCard';
import Button from '../components/Button';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';
import './AdminMasterDashboard.css';

export default function AdminMasterDashboard({ theme, toggleTheme }) {
  const [crs, setCrs] = useState([
    { id: 1, email: 'cr.it1@college.edu', dept: 'IT', year: '1st Year' },
    { id: 2, email: 'cr.cse2@college.edu', dept: 'CSE', year: '2nd Year' }
  ]);

  return (
    <div className="page-wrapper admin-wrapper">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        userText="🛡️ Master Admin" 
        onLogout={() => console.log('Logged out of Admin')} 
      />

      <main className="dashboard-main">
        <div className="admin-header-row">
          <div>
            <h2 className="section-title">Class Representatives Management</h2>
            <p className="admin-subtitle">Add, edit, or remove CR access to the analytics platform.</p>
          </div>
          <Button variant="primary" icon={<UserPlus size={16} />}>Add New CR</Button>
        </div>

        <GlassCard className="table-card">
          <div className="table-responsive">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>Email / Username</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {crs.map(cr => (
                  <tr key={cr.id}>
                    <td className="fw-500">{cr.email}</td>
                    <td><span className="badge-dept">{cr.dept}</span></td>
                    <td>{cr.year}</td>
                    <td className="actions-cell">
                      <button className="icon-btn text-muted"><Edit2 size={16} /></button>
                      <button className="icon-btn text-error"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {crs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">No Class Representatives found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

      </main>
    </div>
  );
}
