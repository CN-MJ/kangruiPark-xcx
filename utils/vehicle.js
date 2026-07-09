const { userRequest } = require('./request')

function getVehicles() {
  return userRequest('/user/vehicles').then((res) => res.data || [])
}

function bindVehicle(plateNumber, isDefault = false) {
  return userRequest('/user/vehicles', {
    method: 'POST',
    data: { plate_number: plateNumber, is_default: isDefault },
  })
}

function unbindVehicle(id) {
  return userRequest(`/user/vehicles/${id}`, { method: 'DELETE' })
}

function setDefaultVehicle(id) {
  return userRequest(`/user/vehicles/${id}/default`, { method: 'PATCH' })
}

function getPendingEvents() {
  return userRequest('/parking/pending-events').then((res) => res.data || { list: [], count: 0 })
}

function confirmEntry(eventId) {
  return userRequest('/parking/confirm-entry', {
    method: 'POST',
    data: { event_id: eventId },
  })
}

function confirmExit(eventId) {
  return userRequest('/parking/confirm-exit', {
    method: 'POST',
    data: { event_id: eventId },
  })
}

module.exports = {
  getVehicles,
  bindVehicle,
  unbindVehicle,
  setDefaultVehicle,
  getPendingEvents,
  confirmEntry,
  confirmExit,
}
