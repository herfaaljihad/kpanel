import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemInfo();
    // Set up polling for real-time updates
    const interval = setInterval(fetchSystemInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await axios.get('/api/system/info');
      setSystemInfo(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch system information');
      console.error('Error fetching system info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>🎛️ KPanel - Control Panel</h1>
        </header>
        <main className="main-content">
          <div className="loading">Loading system information...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎛️ KPanel - Control Panel</h1>
      </header>
      
      <main className="main-content">
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        <div className="dashboard-grid">
          <div className="card">
            <h3>📊 System Status</h3>
            <p>Server: <span className="status online">Online</span></p>
            <p>API: <span className="status online">Connected</span></p>
            <p>Last Update: {new Date().toLocaleTimeString()}</p>
          </div>

          <div className="card">
            <h3>💾 System Information</h3>
            {systemInfo ? (
              <>
                <p>Platform: {systemInfo.platform || 'N/A'}</p>
                <p>Architecture: {systemInfo.arch || 'N/A'}</p>
                <p>Node.js: {systemInfo.nodeVersion || 'N/A'}</p>
                <p>Uptime: {systemInfo.uptime ? `${Math.floor(systemInfo.uptime / 3600)}h` : 'N/A'}</p>
              </>
            ) : (
              <p>System information not available</p>
            )}
          </div>

          <div className="card">
            <h3>🔧 Quick Actions</h3>
            <a href="/api/health" className="btn" target="_blank" rel="noopener noreferrer">
              Health Check
            </a>
            <a href="/api/system/info" className="btn" target="_blank" rel="noopener noreferrer">
              System Info API
            </a>
          </div>

          <div className="card">
            <h3>📝 Server Management</h3>
            <p>Manage your server files, databases, and configurations through KPanel's powerful interface.</p>
            <p>Features include:</p>
            <ul>
              <li>File Manager</li>
              <li>Database Management</li>
              <li>User Management</li>
              <li>System Monitoring</li>
            </ul>
          </div>

          <div className="card">
            <h3>🚀 Getting Started</h3>
            <p>Welcome to KPanel! This is a modern server control panel built with React and Node.js.</p>
            <p>Use the navigation above to access different management tools and monitor your server's performance in real-time.</p>
          </div>

          <div className="card">
            <h3>ℹ️ About KPanel</h3>
            <p>Version: 2.0.0</p>
            <p>A lightweight, modern control panel for server management.</p>
            <p>Built with React, Node.js, and Express.</p>
            <a href="https://github.com/herfaaljihad/kpanel" className="btn" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;