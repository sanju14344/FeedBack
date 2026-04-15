import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, BarChart2, MessageSquare, Settings, Database } from 'lucide-react';
import './HexagonLoader.css';

export default function HexagonLoader({ text = "Loading dashboard..." }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate a fake progress bar fill
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        // Slow down as it gets closer to 100
        const increment = Math.max(0.5, (100 - prev) / 15);
        return prev + increment;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loader-container">
      <div className="loader-wrapper">
        <div className="hex-grid">
          <div className="hex hex-center">
            <LayoutDashboard size={24} className="hex-icon" />
          </div>
          <div className="hex hex-1"><Users size={16} /></div>
          <div className="hex hex-2"><BarChart2 size={16} /></div>
          <div className="hex hex-3"><Settings size={16} /></div>
          <div className="hex hex-4"><Database size={16} /></div>
          <div className="hex hex-5"><MessageSquare size={16} /></div>
          <div className="hex hex-6"><Users size={16} /></div>
        </div>
        
        <div className="loader-text">{text}</div>
        
        <div className="loader-progress-bar">
          <div className="loader-progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
