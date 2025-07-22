-- EID Registry Database Schema
-- PostgreSQL schema for EID classification and metrics storage

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS eid_registry;

-- EID Registry table
CREATE TABLE IF NOT EXISTS eid_registry.eids (
    -- Primary key: The Elasticsearch field value (detail.event.data.traffic.eid.keyword)
    id VARCHAR(255) PRIMARY KEY,
    
    -- Human-readable unique name
    name VARCHAR(255) NOT NULL UNIQUE,
    
    -- Classification flags
    is_rad BOOLEAN NOT NULL DEFAULT FALSE,
    is_experiment BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Computed type (stored for performance)
    -- 1 = EXPERIMENT_ONLY, 2 = RAD_ONLY, 3 = RAD_AND_EXPERIMENT
    type SMALLINT GENERATED ALWAYS AS (
        CASE 
            WHEN is_rad AND is_experiment THEN 3
            WHEN is_rad THEN 2
            WHEN is_experiment THEN 1
            ELSE 0
        END
    ) STORED,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'testing' CHECK (status IN ('testing', 'live', 'old')),
    
    -- Metadata
    description TEXT,
    owner VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Ensure at least one classification is set
    CONSTRAINT valid_classification CHECK (is_rad OR is_experiment)
);

-- Tags table for many-to-many relationship
CREATE TABLE IF NOT EXISTS eid_registry.eid_tags (
    eid_id VARCHAR(255) NOT NULL REFERENCES eid_registry.eids(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (eid_id, tag)
);

-- EID Metrics table for storing calculated values
CREATE TABLE IF NOT EXISTS eid_registry.eid_metrics (
    id SERIAL PRIMARY KEY,
    eid_id VARCHAR(255) NOT NULL REFERENCES eid_registry.eids(id) ON DELETE CASCADE,
    
    -- Health metrics
    health_score NUMERIC(5,2),
    health_status VARCHAR(50),
    
    -- Performance metrics
    avg_latency NUMERIC(10,2),
    p95_latency NUMERIC(10,2),
    p99_latency NUMERIC(10,2),
    
    -- Traffic metrics
    event_count BIGINT,
    error_rate NUMERIC(5,4),
    success_rate NUMERIC(5,4),
    
    -- Baseline comparison
    traffic_change_percent NUMERIC(10,2),
    latency_change_percent NUMERIC(10,2),
    error_rate_change NUMERIC(5,4),
    
    -- Calculated status
    performance_score NUMERIC(5,2),
    
    -- Metadata
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    time_window VARCHAR(20) NOT NULL,
    query_template VARCHAR(100),
    
    -- Raw query result (JSON)
    raw_result JSONB
);

-- Latest metrics view for quick access
CREATE OR REPLACE VIEW eid_registry.eid_latest_metrics AS
SELECT DISTINCT ON (eid_id)
    eid_id,
    health_score,
    health_status,
    avg_latency,
    p95_latency,
    p99_latency,
    event_count,
    error_rate,
    success_rate,
    traffic_change_percent,
    latency_change_percent,
    error_rate_change,
    performance_score,
    calculated_at,
    time_window,
    query_template
FROM eid_registry.eid_metrics
ORDER BY eid_id, calculated_at DESC;

-- EID with metrics view
CREATE OR REPLACE VIEW eid_registry.eids_with_metrics AS
SELECT 
    e.*,
    m.health_score,
    m.health_status,
    m.avg_latency,
    m.p95_latency,
    m.event_count,
    m.error_rate,
    m.performance_score,
    m.calculated_at as metrics_calculated_at
FROM eid_registry.eids e
LEFT JOIN eid_registry.eid_latest_metrics m ON e.id = m.eid_id;

-- Indexes for performance
CREATE INDEX idx_eids_type ON eid_registry.eids(type);
CREATE INDEX idx_eids_status ON eid_registry.eids(status);
CREATE INDEX idx_eids_owner ON eid_registry.eids(owner);
CREATE INDEX idx_eids_created_at ON eid_registry.eids(created_at);
CREATE INDEX idx_eids_updated_at ON eid_registry.eids(updated_at);

CREATE INDEX idx_eid_tags_tag ON eid_registry.eid_tags(tag);
CREATE INDEX idx_eid_tags_eid_id ON eid_registry.eid_tags(eid_id);

CREATE INDEX idx_eid_metrics_eid_id ON eid_registry.eid_metrics(eid_id);
CREATE INDEX idx_eid_metrics_calculated_at ON eid_registry.eid_metrics(calculated_at);
CREATE INDEX idx_eid_metrics_health_status ON eid_registry.eid_metrics(health_status);

-- Full text search index
CREATE INDEX idx_eids_search ON eid_registry.eids USING gin(
    to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION eid_registry.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eids_updated_at BEFORE UPDATE ON eid_registry.eids
    FOR EACH ROW EXECUTE FUNCTION eid_registry.update_updated_at_column();

-- Function to get registry statistics
CREATE OR REPLACE FUNCTION eid_registry.get_registry_stats()
RETURNS TABLE (
    total_eids BIGINT,
    experiment_only BIGINT,
    rad_only BIGINT,
    rad_and_experiment BIGINT,
    testing BIGINT,
    live BIGINT,
    old BIGINT,
    with_metrics BIGINT,
    healthy BIGINT,
    warning BIGINT,
    critical BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_eids,
        COUNT(*) FILTER (WHERE type = 1)::BIGINT as experiment_only,
        COUNT(*) FILTER (WHERE type = 2)::BIGINT as rad_only,
        COUNT(*) FILTER (WHERE type = 3)::BIGINT as rad_and_experiment,
        COUNT(*) FILTER (WHERE status = 'testing')::BIGINT as testing,
        COUNT(*) FILTER (WHERE status = 'live')::BIGINT as live,
        COUNT(*) FILTER (WHERE status = 'old')::BIGINT as old,
        COUNT(DISTINCT m.eid_id)::BIGINT as with_metrics,
        COUNT(DISTINCT m.eid_id) FILTER (WHERE m.health_status = 'HEALTHY')::BIGINT as healthy,
        COUNT(DISTINCT m.eid_id) FILTER (WHERE m.health_status = 'WARNING')::BIGINT as warning,
        COUNT(DISTINCT m.eid_id) FILTER (WHERE m.health_status = 'CRITICAL')::BIGINT as critical
    FROM eid_registry.eids e
    LEFT JOIN eid_registry.eid_latest_metrics m ON e.id = m.eid_id;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
/*
INSERT INTO eid_registry.eids (id, name, is_rad, is_experiment, status, description, owner)
VALUES 
    ('eid-12345', 'Homepage Banner A/B Test', false, true, 'live', 'Testing new homepage banner designs', 'marketing-team'),
    ('eid-67890', 'Checkout Flow RAD', true, false, 'live', 'Revenue acceleration for checkout process', 'revenue-team'),
    ('eid-11111', 'Search Algorithm v2', true, true, 'testing', 'New search algorithm with RAD tracking', 'search-team'),
    ('eid-22222', 'Legacy Payment Gateway', false, true, 'old', 'Old payment gateway integration', 'payments-team');

INSERT INTO eid_registry.eid_tags (eid_id, tag)
VALUES 
    ('eid-12345', 'homepage'),
    ('eid-12345', 'ab-test'),
    ('eid-67890', 'checkout'),
    ('eid-67890', 'revenue'),
    ('eid-11111', 'search'),
    ('eid-11111', 'experimental');
*/