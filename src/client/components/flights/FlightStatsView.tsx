import React from 'react';
import type { FlightStats } from './types';

interface FlightStatsViewProps {
  stats: FlightStats | null;
}

export const FlightStatsView: React.FC<FlightStatsViewProps> = ({ stats }) => (
  <div className="flight-stats-grid">
    <div className="stat-card primary">
      <div className="stat-icon">✈</div>
      <div className="stat-value">{stats?.totalFlights || 0}</div>
      <div className="stat-label">Total Flights</div>
    </div>

    <div className="stat-card">
      <div className="stat-icon">👥</div>
      <div className="stat-value">{stats?.uniquePassengers || 0}</div>
      <div className="stat-label">Unique Passengers</div>
    </div>

    <div className="stat-card full-width">
      <h3>Top Passengers</h3>
      <div className="stat-bars">
        {stats?.topPassengers.slice(0, 8).map((p, i) => (
          <div key={i} className="stat-bar-item">
            <span className="bar-label">{p.name}</span>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(p.count / (stats.topPassengers[0]?.count || 1)) * 100}%` }}
              />
            </div>
            <span className="bar-value">{p.count}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="stat-card">
      <h3>Top Routes</h3>
      <div className="route-list">
        {stats?.topRoutes.slice(0, 5).map((r, i) => (
          <div key={i} className="route-item">
            <span className="route-path">{r.route}</span>
            <span className="route-count">{r.count}x</span>
          </div>
        ))}
      </div>
    </div>

    <div className="stat-card">
      <h3>Flights by Year</h3>
      <div className="year-chart">
        {stats?.flightsByYear.map((y, i) => (
          <div key={i} className="year-bar">
            <div
              className="year-fill"
              style={{
                height: `${(y.count / Math.max(1, ...stats.flightsByYear.map((x) => x.count))) * 100}%`,
              }}
            />
            <span className="year-label">{y.year}</span>
            <span className="year-count">{y.count}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
