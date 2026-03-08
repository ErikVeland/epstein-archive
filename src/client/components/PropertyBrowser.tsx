import React, { useState, useEffect, useMemo } from 'react';
import Icon from './common/Icon';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { Select } from './common/Select';

interface Property {
  id: number;
  pcn: string;
  owner_name_1: string | null;
  owner_name_2: string | null;
  street_name: string | null;
  site_address: string | null;
  total_tax_value: number | null;
  acres: number | null;
  property_use: string | null;
  year_built: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  stories: number | null;
  building_value: number | null;
  building_area: number | null;
  living_area: number | null;
  is_epstein_property: number;
  is_known_associate: number;
  linked_entity_id: number | null;
}

interface PropertyStats {
  totalProperties: number;
  epsteinProperties: number;
  knownAssociateProperties: number;
  avgTaxValue: number;
  maxTaxValue: number;
  propertyTypes: { type: string; count: number }[];
}

interface ValueDistribution {
  range: string;
  count: number;
  min: number;
  max: number;
}

const PropertyBrowser: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [valueDistribution, setValueDistribution] = useState<ValueDistribution[]>([]);
  const [topOwners, setTopOwners] = useState<
    { owner_name: string; property_count: number; total_value: number }[]
  >([]);
  const [knownAssociates, setKnownAssociates] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [viewMode, setViewMode] = useState<'browse' | 'associates' | 'analytics'>('browse');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [minValue, setMinValue] = useState('');
  const maxValue = '';
  const [showAssociatesOnly, setShowAssociatesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const propertyTypes = useMemo(() => {
    return stats?.propertyTypes || [];
  }, [stats]);

  const loadProperties = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (propertyType) params.append('type', propertyType);
      if (minValue) params.append('minValue', minValue);
      if (maxValue) params.append('maxValue', maxValue);
      if (showAssociatesOnly) params.append('associatesOnly', 'true');
      params.append('page', page.toString());
      params.append('limit', '50');

      const res = await fetch(`/api/properties?${params}`);
      const data = await res.json();

      setProperties(data.properties || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, propertyType, minValue, maxValue, showAssociatesOnly, page]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const loadInitialData = async () => {
    try {
      const statsRes = await fetch('/api/properties/stats');

      // Check if we got a valid JSON response (not 404 HTML page)
      const contentType = statsRes.headers.get('content-type');
      if (!statsRes.ok || !contentType?.includes('application/json')) {
        setDataUnavailable(true);
        setLoading(false);
        return;
      }

      const [distRes, ownersRes, associatesRes] = await Promise.all([
        fetch('/api/properties/value-distribution'),
        fetch('/api/properties/top-owners'),
        fetch('/api/properties/known-associates'),
      ]);

      const statsData = await statsRes.json();

      // Check if stats indicate no data
      if (
        !statsData ||
        statsData.totalProperties === 0 ||
        statsData.totalProperties === undefined
      ) {
        setDataUnavailable(true);
        setLoading(false);
        return;
      }

      const [distData, ownersData, associatesData] = await Promise.all([
        distRes.ok ? distRes.json() : [],
        ownersRes.ok ? ownersRes.json() : [],
        associatesRes.ok ? associatesRes.json() : [],
      ]);

      setStats(statsData);
      setValueDistribution(distData || []);
      setTopOwners(ownersData || []);
      setKnownAssociates(associatesData || []);
    } catch (error) {
      console.error('Failed to load property stats:', error);
      setDataUnavailable(true);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Show coming soon state if data is unavailable
  if (dataUnavailable) {
    return (
      <div className="property-browser">
        <div className="property-header">
          <h1>
            <Icon name="Building" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className="subtitle">Explore properties from Palm Beach County public records</p>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <Icon name="Building" size="xl" className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Property Data Coming Soon</h2>
          <p className="text-slate-400 max-w-md mb-6">
            The Palm Beach County property records integration is currently in development. This
            feature will allow you to explore property ownership records and identify connections to
            known associates.
          </p>
          <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg">
            <Icon name="Clock" size="sm" />
            <span>Expected in a future update</span>
          </div>
        </div>
      </div>
    );
  }

  const BrowseView = () => (
    <div className="property-browse">
      {/* Filters Bar */}
      <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size="sm"
            />
            <input
              type="text"
              placeholder="Search properties, owners, addresses..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Select
              containerClassName="min-w-[180px]"
              value={propertyType}
              onChange={(e) => {
                setPropertyType(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'All Property Types' },
                ...propertyTypes.map((t) => ({ value: t.type, label: t.type })),
              ]}
            />

            <Select
              containerClassName="min-w-[160px]"
              value={minValue}
              onChange={(e) => {
                setMinValue(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Min Value: Any' },
                { value: '1000000', label: '$1M+' },
                { value: '5000000', label: '$5M+' },
                { value: '10000000', label: '$10M+' },
                { value: '50000000', label: '$50M+' },
              ]}
            />

            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-lg px-4">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={showAssociatesOnly}
                  onChange={(e) => {
                    setShowAssociatesOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 rounded border-slate-600 text-blue-500 focus:ring-blue-500/50 bg-slate-800"
                />
                Known Associates Only
              </label>
            </div>

            {/* View Toggle */}
            <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setViewMode('browse')}
                className={`p-2 rounded-md transition-all ${viewMode === 'browse' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Browse List"
              >
                <Icon name="List" size="sm" />
              </button>
              <button
                onClick={() => setViewMode('associates')}
                className={`p-2 rounded-md transition-all ${viewMode === 'associates' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Known Associates"
              >
                <Icon name="Users" size="sm" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-2 rounded-md transition-all ${viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Analytics"
              >
                <Icon name="BarChart3" size="sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Property List */}
      <div className="property-list-section">
        {loading ? (
          <div className="loading-state">
            <Icon name="Loader2" className="spin" size="sm" /> Loading properties...
          </div>
        ) : (
          <>
            <div className="property-grid">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className={`property-card ${property.is_known_associate ? 'flagged' : ''}`}
                >
                  {property.is_known_associate === 1 && (
                    <div className="associate-badge">
                      <Icon name="AlertTriangle" size="sm" />
                      Known Associate
                    </div>
                  )}
                  {property.is_epstein_property === 1 && (
                    <div className="associate-badge epstein">
                      <Icon name="AlertTriangle" size="sm" />
                      Epstein Property
                    </div>
                  )}
                  <div className="property-header">
                    <h4>{property.owner_name_1 || 'Unknown Owner'}</h4>
                    <span className="property-value">
                      {formatCurrency(property.total_tax_value)}
                    </span>
                  </div>
                  <div className="property-address">
                    <Icon name="MapPin" size="sm" />
                    {property.site_address || property.street_name || 'Address N/A'}
                  </div>
                  <div className="property-details">
                    <span>
                      <strong>Type:</strong> {property.property_use || 'N/A'}
                    </span>
                    <span>
                      <strong>Built:</strong> {property.year_built || 'N/A'}
                    </span>
                    {property.bedrooms && property.bedrooms > 0 && (
                      <span>
                        <strong>Beds:</strong> {property.bedrooms}
                      </span>
                    )}
                    {property.full_bathrooms && property.full_bathrooms > 0 && (
                      <span>
                        <strong>Baths:</strong> {property.full_bathrooms}
                      </span>
                    )}
                    {property.living_area && property.living_area > 0 && (
                      <span>
                        <strong>Living:</strong> {formatNumber(property.living_area)} sqft
                      </span>
                    )}
                    {property.acres && property.acres > 0 && (
                      <span>
                        <strong>Acres:</strong> {property.acres.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="property-values">
                    <div>
                      <span className="label">Building</span>
                      <span className="value">{formatCurrency(property.building_value)}</span>
                    </div>
                  </div>
                  {property.is_known_associate === 1 && property.linked_entity_id && (
                    <Link to={`/entity/${property.linked_entity_id}`} className="associate-link">
                      <Icon name="User" size="sm" />
                      View Entity Profile
                    </Link>
                  )}
                  <div
                    className="property-actions"
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <AddToInvestigationButton
                      item={{
                        id: String(property.id),
                        title: `${property.owner_name_1 || 'Unknown'} - ${property.site_address || property.street_name || 'Unknown Address'}`,
                        description: `${property.property_use || 'Property'} valued at ${formatCurrency(property.total_tax_value)}${property.is_known_associate ? ' (Known Associate)' : ''}`,
                        type: 'property',
                        sourceId: String(property.id),
                        metadata: {
                          owner: property.owner_name_1,
                          address: property.site_address || property.street_name,
                          value: property.total_tax_value,
                          isKnownAssociate: property.is_known_associate === 1,
                          linkedEntityId: property.linked_entity_id,
                        },
                      }}
                      variant="quick"
                      className="w-full justify-center"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="page-btn"
              >
                <Icon name="ChevronLeft" size="sm" />
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="page-btn"
              >
                <Icon name="ChevronRight" size="sm" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const AssociatesView = () => (
    <div className="associates-view">
      <div className="associates-header">
        <h3>
          <Icon name="AlertTriangle" size="md" />
          Properties Linked to Known Associates
        </h3>
        <p className="associates-description">
          {knownAssociates.length} properties have been flagged as potentially linked to known
          associates of Jeffrey Epstein based on name matching with entities in the archive.
        </p>
      </div>

      <div className="associates-grid">
        {knownAssociates.map((property) => (
          <div key={property.id} className="associate-property-card">
            <div className="associate-info">
              <div className="associate-name">
                <Icon name="User" size="sm" />
                {property.owner_name_1 || 'Unknown'}
              </div>
              {property.linked_entity_id && (
                <Link to={`/entity/${property.linked_entity_id}`} className="view-profile-btn">
                  View Profile <Icon name="ExternalLink" size="sm" />
                </Link>
              )}
            </div>
            <div className="property-info">
              <h4>{property.owner_name_1 || 'Unknown Owner'}</h4>
              <p className="address">
                {property.site_address || property.street_name || 'Address N/A'}
              </p>
              <div className="value-row">
                <span className="total-value">{formatCurrency(property.total_tax_value)}</span>
                <span className="property-type">{property.property_use || 'N/A'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AnalyticsView = () => (
    <div className="analytics-view">
      {/* Value Distribution */}
      <div className="analytics-section">
        <h3>Property Value Distribution</h3>
        <div className="value-chart">
          {valueDistribution.map((bucket, i) => {
            const maxCount = Math.max(...valueDistribution.map((v) => v.count));
            const height = (bucket.count / maxCount) * 100;
            return (
              <div key={i} className="chart-bar">
                <div
                  className="bar-fill"
                  style={{ height: `${height}%` }}
                  title={`${bucket.count} properties`}
                />
                <span className="bar-label">{bucket.range}</span>
                <span className="bar-count">{formatNumber(bucket.count)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Owners */}
      <div className="analytics-section">
        <h3>Top Property Owners</h3>
        <div className="top-owners-list">
          {topOwners.slice(0, 20).map((owner, i) => (
            <div key={i} className="owner-row">
              <span className="rank">#{i + 1}</span>
              <span className="owner-name">{owner.owner_name}</span>
              <span className="property-count">{owner.property_count} properties</span>
              <span className="total-value">{formatCurrency(owner.total_value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Property Types */}
      <div className="analytics-section">
        <h3>Property Types</h3>
        <div className="type-breakdown">
          {propertyTypes.slice(0, 10).map((pt) => (
            <div key={pt.type} className="type-item">
              <span className="type-name">{pt.type || 'Unknown'}</span>
              <div className="type-bar">
                <div
                  className="type-fill"
                  style={{
                    width: `${(pt.count / (stats?.totalProperties || 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="type-count">{formatNumber(pt.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="property-browser">
      {/* Header */}
      <div className="browser-header">
        <div className="header-content">
          <h1>
            <Icon name="Home" size="lg" />
            Palm Beach Property Records
          </h1>
          <p className="subtitle">
            Explore {stats ? formatNumber(stats.totalProperties) : '...'} properties from Palm Beach
            County public records
          </p>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="stats-summary">
            <div className="stat-card">
              <Icon name="Home" size="md" />
              <div className="stat-value">{formatNumber(stats.totalProperties)}</div>
              <div className="stat-label">Total Properties</div>
            </div>
            <div className="stat-card">
              <Icon name="DollarSign" size="md" />
              <div className="stat-value">{formatCurrency(stats.maxTaxValue)}</div>
              <div className="stat-label">Max Value</div>
            </div>
            <div className="stat-card">
              <Icon name="TrendingUp" size="md" />
              <div className="stat-value">{formatCurrency(stats.avgTaxValue)}</div>
              <div className="stat-label">Average Value</div>
            </div>
            <div className="stat-card flagged">
              <Icon name="AlertTriangle" size="md" />
              <div className="stat-value">{stats.knownAssociateProperties}</div>
              <div className="stat-label">Known Associates</div>
            </div>
          </div>
        )}
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`tab ${viewMode === 'browse' ? 'active' : ''}`}
          onClick={() => setViewMode('browse')}
        >
          <Icon name="Grid" size="sm" />
          Browse Properties
        </button>
        <button
          className={`tab ${viewMode === 'associates' ? 'active' : ''}`}
          onClick={() => setViewMode('associates')}
        >
          <Icon name="AlertTriangle" size="sm" />
          Known Associates ({knownAssociates.length})
        </button>
        <button
          className={`tab ${viewMode === 'analytics' ? 'active' : ''}`}
          onClick={() => setViewMode('analytics')}
        >
          <Icon name="BarChart3" size="sm" />
          Analytics
        </button>
      </div>

      {/* Content */}
      <div className="browser-content">
        {viewMode === 'browse' && <BrowseView />}
        {viewMode === 'associates' && <AssociatesView />}
        {viewMode === 'analytics' && <AnalyticsView />}
      </div>

      <style>{`
        .property-browser {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .browser-header {
          margin-bottom: 24px;
        }

        .header-content h1 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.75rem;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: var(--text-secondary, #888);
          margin: 0;
        }

        .stats-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-top: 20px;
        }

        .stat-card {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .stat-card.flagged {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary, #888);
        }

        .view-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
          padding-bottom: 12px;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: transparent;
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 8px;
          color: var(--text-secondary, #888);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab:hover {
          background: var(--card-bg, #1a1a2e);
          color: var(--text-primary, #fff);
        }

        .tab.active {
          background: var(--primary-color, #6366f1);
          border-color: var(--primary-color, #6366f1);
          color: #fff;
        }

        .property-filters {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 0.85rem;
          color: var(--text-secondary, #888);
        }

        .filter-group.checkbox {
          flex-direction: row;
          align-items: center;
        }

        .filter-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .filter-input, .filter-select {
          background: var(--bg-secondary, #0a0a1a);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary, #fff);
          min-width: 200px;
        }

        .filter-input.small {
          min-width: 120px;
        }

        .property-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .property-list-section {
          padding-top: 12px;
        }

        .property-card {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
          padding: 16px;
          position: relative;
          transition: all 0.2s;
        }

        .property-card:hover {
          border-color: var(--primary-color, #6366f1);
          transform: translateY(-2px);
        }

        .property-card.flagged {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.05);
        }

        .associate-badge {
          position: absolute;
          top: -8px;
          right: 12px;
          background: #f59e0b;
          color: #000;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .property-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .property-header h4 {
          margin: 0;
          font-size: 1rem;
          flex: 1;
        }

        .property-value {
          font-weight: 700;
          color: #10b981;
          white-space: nowrap;
          margin-left: 12px;
        }

        .property-address {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary, #888);
          font-size: 0.9rem;
          margin-bottom: 12px;
        }

        .property-details {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.85rem;
          margin-bottom: 12px;
        }

        .property-values {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color, #2a2a4a);
        }

        .property-values .label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary, #888);
        }

        .property-values .value {
          font-weight: 600;
        }

        .associate-link {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color, #2a2a4a);
          color: var(--primary-color, #6366f1);
          text-decoration: none;
          font-size: 0.9rem;
        }

        .associate-link:hover {
          text-decoration: underline;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
        }

        .page-btn {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-primary, #fff);
          cursor: pointer;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .page-info {
          color: var(--text-secondary, #888);
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px;
          color: var(--text-secondary, #888);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Associates View */
        .associates-header {
          margin-bottom: 24px;
        }

        .associates-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f59e0b;
        }

        .associates-description {
          color: var(--text-secondary, #888);
        }

        .associates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 16px;
        }

        .associate-property-card {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid #f59e0b;
          border-radius: 12px;
          overflow: hidden;
        }

        .associate-info {
          background: rgba(245, 158, 11, 0.15);
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .associate-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #f59e0b;
        }

        .view-profile-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85rem;
          color: var(--text-secondary, #888);
          text-decoration: none;
        }

        .view-profile-btn:hover {
          color: var(--primary-color, #6366f1);
        }

        .property-info {
          padding: 16px;
        }

        .property-info h4 {
          margin: 0 0 8px 0;
        }

        .property-info .address {
          color: var(--text-secondary, #888);
          margin: 0 0 12px 0;
          font-size: 0.9rem;
        }

        .value-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #10b981;
        }

        .property-type {
          background: var(--bg-secondary, #0a0a1a);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        /* Analytics View */
        .analytics-section {
          background: var(--card-bg, #1a1a2e);
          border: 1px solid var(--border-color, #2a2a4a);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .analytics-section h3 {
          margin: 0 0 16px 0;
        }

        .value-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 200px;
          padding-top: 20px;
        }

        .chart-bar {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--primary-color, #6366f1), #818cf8);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
          margin-top: auto;
        }

        .bar-label {
          font-size: 0.7rem;
          color: var(--text-secondary, #888);
          margin-top: 8px;
          text-align: center;
        }

        .bar-count {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .top-owners-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .owner-row {
          display: grid;
          grid-template-columns: 40px 1fr auto auto;
          gap: 16px;
          align-items: center;
          padding: 12px;
          background: var(--bg-secondary, #0a0a1a);
          border-radius: 8px;
        }

        .rank {
          font-weight: 700;
          color: var(--primary-color, #6366f1);
        }

        .owner-name {
          font-weight: 500;
        }

        .property-count {
          color: var(--text-secondary, #888);
          font-size: 0.9rem;
        }

        .type-breakdown {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .type-item {
          display: grid;
          grid-template-columns: 150px 1fr 80px;
          gap: 12px;
          align-items: center;
        }

        .type-name {
          font-size: 0.9rem;
        }

        .type-bar {
          height: 8px;
          background: var(--bg-secondary, #0a0a1a);
          border-radius: 4px;
          overflow: hidden;
        }

        .type-fill {
          height: 100%;
          background: var(--primary-color, #6366f1);
          border-radius: 4px;
        }

        .type-count {
          text-align: right;
          font-size: 0.9rem;
          color: var(--text-secondary, #888);
        }

        @media (max-width: 768px) {
          .filter-row {
            flex-direction: column;
          }

          .filter-input, .filter-select {
            min-width: 100%;
          }

          .stats-summary {
            grid-template-columns: repeat(2, 1fr);
          }

          .property-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PropertyBrowser;
