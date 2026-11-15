const ROOM_MAX_PLAYERS = 4

const ROLE_LABELS = {
  designer: 'Mission Designer',
  engineer: 'Spacecraft Engineer',
  communications: 'Communications Officer',
  science: 'Science Lead',
}

const FIELD_ROLE_MAP = {
  missionId: 'designer',
  rocketId: 'designer',
  orbitId: 'designer',
  solarId: 'engineer',
  batteryId: 'engineer',
  antennaId: 'engineer',
  shieldingId: 'engineer',
  instrumentIds: 'science',
  stations: 'communications',
}

function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function createInitialDesign() {
  return {
    missionId: 'earth',
    rocketId: 'falcon9',
    orbitId: 'polar',
    solarId: 'compact',
    batteryId: 'standard',
    antennaId: 'standard',
    shieldingId: 'lightweight',
    instrumentIds: ['camera'],
    stations: 2,
  }
}

function canEditField(field, role) {
  return FIELD_ROLE_MAP[field] === role
}

function isAllowedField(field) {
  return Object.prototype.hasOwnProperty.call(FIELD_ROLE_MAP, field)
}

function normalizeDesign(design = {}) {
  return {
    ...createInitialDesign(),
    ...design,
    instrumentIds: Array.isArray(design.instrumentIds) ? [...design.instrumentIds] : [...createInitialDesign().instrumentIds],
  }
}

module.exports = {
  ROOM_MAX_PLAYERS,
  ROLE_LABELS,
  FIELD_ROLE_MAP,
  makeRoomCode,
  createInitialDesign,
  canEditField,
  isAllowedField,
  normalizeDesign,
}
