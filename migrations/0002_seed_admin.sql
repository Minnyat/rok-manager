-- Default admin account: username "admin", password "ChangeMe123!"
-- Generate your own hash: node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
INSERT OR IGNORE INTO users (username, password_hash, role, main_governor_id, is_active)
VALUES ('admin', '$2a$10$exampleHashReplaceWithYourOwn000000000000000000000', 'admin', 0, 1);
