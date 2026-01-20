CREATE TABLE users (
    id                 INTEGER   PRIMARY KEY AUTOINCREMENT,
    email              TEXT      NOT NULL
                                 UNIQUE,
    hashed_password    TEXT      NOT NULL,
    username           TEXT,
    verified           BOOLEAN   DEFAULT 0,
    verification_token TEXT,
    modified_by        TEXT,
    date_created       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modified      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    membership_status  TEXT      DEFAULT 'unverified',
    first_name         TEXT,
    last_name          TEXT,
    role               TEXT      DEFAULT 'member',
    account_status     TEXT      DEFAULT 'active',
    last_login         TIMESTAMP,
    avatar             TEXT      DEFAULT NULL,
    token_expiry       DATETIME,
    reset_token        TEXT
, firebase_uid TEXT);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE locations (
    id                    INTEGER   PRIMARY KEY AUTOINCREMENT,
    postal_code           TEXT      NOT NULL,
    latitude              REAL      NOT NULL,
    longitude             REAL      NOT NULL,
    modified_by           INTEGER,
    date_created          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modified         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    street_address        TEXT      NOT NULL,
    street_address_second TEXT,
    city                  TEXT      NOT NULL,
    state                 TEXT      NOT NULL,
    country               TEXT      NOT NULL, "location_open" boolean, "phone" TEXT, "website_url" TEXT,
    FOREIGN KEY (
        modified_by
    )
    REFERENCES users (id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS "categories" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL,
    description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "shops" (
    id            INTEGER   PRIMARY KEY AUTOINCREMENT,
    name          TEXT      NOT NULL,
    description   TEXT,
    created_by    INTEGER   NOT NULL,
    modified_by   INTEGER,
    date_created  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_location   INTEGER   NOT NULL,
    FOREIGN KEY (id_location) REFERENCES locations (id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (modified_by) REFERENCES users (id) ON DELETE SET NULL
);
CREATE TABLE shop_categories (
    shop_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (shop_id, category_id)
);
CREATE TABLE shop_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Optional, for unique identification
    shop_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops (id),
    FOREIGN KEY (location_id) REFERENCES locations (id)
);
CREATE TABLE votes (
    id         INTEGER   PRIMARY KEY AUTOINCREMENT,
    shop_id    TEXT      NOT NULL,
    user_id    INTEGER   NOT NULL,
    upvote     BOOLEAN   NOT NULL
                         DEFAULT 0,
    downvote   BOOLEAN   NOT NULL
                         DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (
        shop_id,
        user_id
    ),
    FOREIGN KEY (
        shop_id
    )
    REFERENCES shops (id) ON DELETE CASCADE,
    FOREIGN KEY (
        user_id
    )
    REFERENCES users (id) ON DELETE CASCADE
);
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_comments_shop ON comments (shop_id, date_created DESC);
CREATE INDEX idx_comments_user ON comments (user_id, date_created DESC);
