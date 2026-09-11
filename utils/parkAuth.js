const TOKEN_KEY = 'park_token'
const USER_KEY = 'park_user'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setAuth(token, user) {
  wx.setStorageSync(TOKEN_KEY, token)
  wx.setStorageSync(USER_KEY, user)
}

function getParkUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function isParkLoggedIn() {
  return !!getToken()
}

function canAccessParkAdmin() {
  if (isParkLoggedIn()) return true
  try {
    const superAuth = require('./superAuth')
    return superAuth.isSuperLoggedIn()
  } catch (e) {
    return false
  }
}

function ensureParkAdmin() {
  if (canAccessParkAdmin()) return true
  wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
  return false
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

module.exports = {
  getToken,
  setAuth,
  getParkUser,
  isParkLoggedIn,
  canAccessParkAdmin,
  ensureParkAdmin,
  clearAuth,
}
