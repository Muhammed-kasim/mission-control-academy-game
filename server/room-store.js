/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const ROOM_TTL_MS = 24 * 60 * 60 * 1000

class RoomStore {
  constructor(databasePath = process.env.ROOM_DATABASE_PATH || path.join(__dirname, '..', 'data', 'mission-control.sqlite')) {
    if (databasePath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true })
    }

    this.database = new DatabaseSync(databasePath)
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        version INTEGER NOT NULL,
        host_player_id TEXT NOT NULL,
        design_json TEXT NOT NULL,
        players_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS rooms_updated_at_idx ON rooms(updated_at);
    `)

    this.deleteExpired = this.database.prepare('DELETE FROM rooms WHERE updated_at < ?')
    this.listRooms = this.database.prepare(`
      SELECT code, created_at, updated_at, version, host_player_id, design_json, players_json
      FROM rooms
      ORDER BY created_at
    `)
    this.upsertRoom = this.database.prepare(`
      INSERT INTO rooms (code, created_at, updated_at, version, host_player_id, design_json, players_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        updated_at = excluded.updated_at,
        version = excluded.version,
        host_player_id = excluded.host_player_id,
        design_json = excluded.design_json,
        players_json = excluded.players_json
    `)
    this.removeRoom = this.database.prepare('DELETE FROM rooms WHERE code = ?')
  }

  loadRooms(now = Date.now()) {
    this.deleteExpired.run(now - ROOM_TTL_MS)
    return this.listRooms.all().map((row) => ({
      code: row.code,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      hostPlayerId: row.host_player_id,
      design: JSON.parse(row.design_json),
      players: JSON.parse(row.players_json),
    }))
  }

  saveRoom(room) {
    this.upsertRoom.run(
      room.code,
      room.createdAt,
      room.updatedAt,
      room.version,
      room.hostPlayerId,
      JSON.stringify(room.design),
      JSON.stringify(room.players),
    )
  }

  deleteRoom(roomCode) {
    this.removeRoom.run(roomCode)
  }

  close() {
    this.database.close()
  }
}

module.exports = { RoomStore }
