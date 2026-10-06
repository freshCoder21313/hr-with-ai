-- Migration 002: Career Knowledge Schema (Phase 7)
-- Run this in the Neon SQL Editor

-- 1. Create table for career profiles
CREATE TABLE IF NOT EXISTS career_profiles (
    id VARCHAR(255) PRIMARY KEY,
    account_id VARCHAR(16) NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for profile queries by owning account
CREATE INDEX IF NOT EXISTS idx_career_profiles_account_id ON career_profiles(account_id);

-- 2. Create table for career facts
CREATE TABLE IF NOT EXISTS career_facts (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    subject TEXT NOT NULL,
    claim TEXT NOT NULL,
    structured JSONB,
    verification_state VARCHAR(50) NOT NULL,
    origin VARCHAR(50) NOT NULL,
    superseded_by VARCHAR(255) REFERENCES career_facts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fact queries and supersession lookup
CREATE INDEX IF NOT EXISTS idx_career_facts_profile_category ON career_facts(profile_id, category);
CREATE INDEX IF NOT EXISTS idx_career_facts_profile_verification ON career_facts(profile_id, verification_state);
CREATE INDEX IF NOT EXISTS idx_career_facts_superseded_by ON career_facts(superseded_by);

-- 3. Create table for career evidence
CREATE TABLE IF NOT EXISTS career_evidence (
    id VARCHAR(255) PRIMARY KEY,
    profile_id VARCHAR(255) NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_ref TEXT,
    excerpt TEXT,
    url TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for evidence queries by profile
CREATE INDEX IF NOT EXISTS idx_career_evidence_profile ON career_evidence(profile_id);

-- 4. Create table for fact-evidence links
CREATE TABLE IF NOT EXISTS fact_evidence_links (
    fact_id VARCHAR(255) NOT NULL REFERENCES career_facts(id) ON DELETE CASCADE,
    evidence_id VARCHAR(255) NOT NULL REFERENCES career_evidence(id) ON DELETE CASCADE,
    relation VARCHAR(50) NOT NULL,
    PRIMARY KEY (fact_id, evidence_id)
);

-- Index for link queries by evidence
CREATE INDEX IF NOT EXISTS idx_fact_evidence_links_evidence ON fact_evidence_links(evidence_id);

-- 5. Create table for career notes
CREATE TABLE IF NOT EXISTS career_notes (
    id VARCHAR(255) PRIMARY KEY,
    fact_id VARCHAR(255) NOT NULL REFERENCES career_facts(id) ON DELETE CASCADE,
    scope VARCHAR(50) NOT NULL DEFAULT 'global',
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for note queries by fact
CREATE INDEX IF NOT EXISTS idx_career_notes_fact ON career_notes(fact_id);
