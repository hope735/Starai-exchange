-- StarAI Exchange — MySQL schema
-- Idempotent: every statement is `CREATE … IF NOT EXISTS` or guarded.

CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(64) PRIMARY KEY,
  email           VARCHAR(190) NOT NULL UNIQUE,
  name            VARCHAR(120) NOT NULL,
  password_hash   VARCHAR(128) NOT NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  kyc_status      ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  recovery_phrase JSON NOT NULL,
  phrase_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  created_at      BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_balances (
  user_id     VARCHAR(64) NOT NULL,
  asset       VARCHAR(16) NOT NULL,
  free        DECIMAL(36,18) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset),
  CONSTRAINT fk_wb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_holdings (
  user_id     VARCHAR(64) NOT NULL,
  asset       VARCHAR(16) NOT NULL,
  amount      DECIMAL(36,18) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset),
  CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallet_bonuses (
  user_id     VARCHAR(64) NOT NULL,
  asset       VARCHAR(16) NOT NULL,
  amount      DECIMAL(36,18) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, asset),
  CONSTRAINT fk_wbns_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  symbol      VARCHAR(32) NOT NULL,
  side        ENUM('buy','sell') NOT NULL,
  type        ENUM('market','limit') NOT NULL,
  price       DECIMAL(36,18) NOT NULL,
  amount      DECIMAL(36,18) NOT NULL,
  total       DECIMAL(36,18) NOT NULL,
  status      ENUM('filled','open','cancelled','partial') NOT NULL DEFAULT 'filled',
  created_at  BIGINT NOT NULL,
  filled_at   BIGINT NULL,
  KEY idx_orders_user (user_id, created_at),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  kind        ENUM('deposit','withdraw','trade','fee') NOT NULL,
  asset       VARCHAR(16) NOT NULL,
  amount      DECIMAL(36,18) NOT NULL,
  value_usd   DECIMAL(36,18) NULL,
  note        VARCHAR(500) NULL,
  status      ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed',
  created_at  BIGINT NOT NULL,
  KEY idx_tx_user (user_id, created_at),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kyc_submissions (
  user_id        VARCHAR(64) PRIMARY KEY,
  status         ENUM('unverified','pending','verified','rejected') NOT NULL,
  full_name      VARCHAR(160) NULL,
  date_of_birth  DATE NULL,
  country        VARCHAR(80) NULL,
  address        VARCHAR(400) NULL,
  document_type  ENUM('passport','id_card','drivers_license') NULL,
  document_number VARCHAR(64) NULL,
  submitted_at   BIGINT NULL,
  reviewed_at    BIGINT NULL,
  rejection_reason VARCHAR(500) NULL,
  CONSTRAINT fk_kyc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(64) PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL,
  category    ENUM('announcement','account','market','security','system') NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  read_flag   TINYINT(1) NOT NULL DEFAULT 0,
  link        VARCHAR(500) NULL,
  created_at  BIGINT NOT NULL,
  KEY idx_notif_user (user_id, created_at),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
