const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'taskflow.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Create tables
        db.run(`CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            assignee TEXT,
            priority TEXT,
            status TEXT,
            due_date TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks (id)
        )`);

        // Seed data if empty
        db.get("SELECT count(*) as count FROM projects", (err, row) => {
            if (row && row.count === 0) {
                console.log('Seeding initial data...');
                db.run(`INSERT INTO projects (name, description) VALUES ('Project Alpha', 'First hackathon project')`, function(err) {
                    if (err) return console.error(err);
                    const projectId = this.lastID;

                    // Decisions
                    db.run(`INSERT INTO decisions (project_id, text) VALUES (?, ?)`, [projectId, "Use MySQL for this project"]);

                    // Tasks
                    db.run(`INSERT INTO tasks (project_id, title, description, assignee, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [projectId, "Setup repository", "Initialize git and basic structure", "Alice", "High", "Done", "2026-10-01"]);
                    db.run(`INSERT INTO tasks (project_id, title, description, assignee, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [projectId, "Design DB schema", "Create ERD for tables", "Bob", "Medium", "In Progress", "2026-10-02"]);
                    db.run(`INSERT INTO tasks (project_id, title, description, assignee, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [projectId, "Write README", "Document the setup process", "Alice", "Low", "To Do", "2026-10-03"]);
                });
            }
        });
    });
}

module.exports = db;
