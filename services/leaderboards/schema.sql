CREATE SCHEMA IF NOT EXISTS artifact_leaderboards;
CREATE TABLE IF NOT EXISTS artifact_leaderboards.launches (
  issuer text NOT NULL, jti text NOT NULL, expires_at timestamptz NOT NULL,
  PRIMARY KEY (issuer, jti)
);
CREATE TABLE IF NOT EXISTS artifact_leaderboards.players (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  issuer text NOT NULL, subject text NOT NULL, display_name text NOT NULL,
  UNIQUE (issuer, subject)
);
CREATE TABLE IF NOT EXISTS artifact_leaderboards.sessions (
  token_hash text PRIMARY KEY, player_id bigint NOT NULL REFERENCES artifact_leaderboards.players,
  game text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON artifact_leaderboards.sessions (expires_at);
CREATE TABLE IF NOT EXISTS artifact_leaderboards.runs (
  id uuid PRIMARY KEY, player_id bigint NOT NULL REFERENCES artifact_leaderboards.players,
  session_hash text NOT NULL, game text NOT NULL, version text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(), submitted_at timestamptz,
  score integer CHECK (score >= 0), wave integer CHECK (wave > 0), duration_ms integer,
  CHECK ((submitted_at IS NULL AND score IS NULL) OR (submitted_at IS NOT NULL AND score IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS runs_ranking ON artifact_leaderboards.runs (game, version, score DESC, submitted_at, id) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS runs_player_started ON artifact_leaderboards.runs (player_id, started_at);
