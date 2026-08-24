import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'truesync.db');
export let database: Database.Database;

export function initDatabase() {
  database = new Database(dbPath);
  database.pragma('journal_mode = WAL');

  // Create tables
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      blueprint_id TEXT,
      arduino_code TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      port TEXT NOT NULL,
      board_type TEXT,
      baud_rate INTEGER,
      last_connected INTEGER,
      project_id TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS sensor_data (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      sensor_name TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      timestamp INTEGER,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT,
      severity TEXT,
      timestamp INTEGER,
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS blueprints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      config TEXT,
      sensors TEXT,
      actuators TEXT,
      difficulty TEXT,
      created_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_project_id ON sensor_data(project_id);
    CREATE INDEX IF NOT EXISTS idx_event_timestamp ON events(timestamp);
  `);

  return database;
}
