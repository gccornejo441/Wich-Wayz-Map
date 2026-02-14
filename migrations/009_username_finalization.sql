BEGIN;

ALTER TABLE users ADD COLUMN username_finalized_at TIMESTAMP;

UPDATE users
SET username_finalized_at = CURRENT_TIMESTAMP
WHERE username_finalized_at IS NULL;

DROP TRIGGER IF EXISTS tr_users_username_immutable;
DROP TRIGGER IF EXISTS tr_users_username_finalize_required;
DROP TRIGGER IF EXISTS tr_users_username_finalized_at_immutable;

CREATE TRIGGER tr_users_username_immutable
BEFORE UPDATE OF username ON users
FOR EACH ROW
WHEN COALESCE(OLD.username, '') <> COALESCE(NEW.username, '')
BEGIN
  SELECT RAISE(ABORT, 'username is finalized')
  WHERE OLD.username_finalized_at IS NOT NULL;
END;

CREATE TRIGGER tr_users_username_finalize_required
BEFORE UPDATE OF username ON users
FOR EACH ROW
WHEN COALESCE(OLD.username, '') <> COALESCE(NEW.username, '')
BEGIN
  SELECT RAISE(ABORT, 'username change must finalize')
  WHERE NEW.username_finalized_at IS NULL;
END;

CREATE TRIGGER tr_users_username_finalized_at_immutable
BEFORE UPDATE OF username_finalized_at ON users
FOR EACH ROW
WHEN OLD.username_finalized_at IS NOT NULL
AND NEW.username_finalized_at <> OLD.username_finalized_at
BEGIN
  SELECT RAISE(ABORT, 'username is finalized');
END;

COMMIT;
