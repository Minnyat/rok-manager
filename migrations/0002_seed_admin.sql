-- Default admin account: username "admin", password "ChangeMe123!"
-- Generate your own hash: node -e "require('bcryptjs').hash('YourPassword',10).then(console.log)"
INSERT OR IGNORE INTO users (username, password_hash, role, main_governor_id, is_active)
VALUES ('admin', '$2a$10$orzaAYOuy1BpcPZHpM.LgOMxOydSM8ph/m43OvOrUNd4.08yPt1yC', 'admin', 0, 1);
