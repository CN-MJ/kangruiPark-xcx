const TOKEN_KEY = 'park_token'
const USER_KEY = 'park_user'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setAuth(token, user) {
  wx.setStorageSync(TOKEN_KEY, token)
  wx.setStorageSync(USER_KEY, user || null)
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

function hasPermission(permission) {
  if (!permission) return true
  try {
    const superAuth = require('./superAuth')
    // 超管代管工作台：菜单全开（请求会带 X-Park-Act-As）
    if (superAuth.isSuperLoggedIn() && !isParkLoggedIn()) {
      return true
    }
  } catch (e) {}

  const user = getParkUser()
  const perms = (user && user.permissions) || []
  if (perms.indexOf('*') !== -1) return true
  return perms.indexOf(permission) !== -1
}

/** 当前是否以超管代管方式访问工作台（无园区 token） */
function isSuperActingAsPark() {
  if (isParkLoggedIn()) return false
  try {
    const superAuth = require('./superAuth')
    return superAuth.isSuperLoggedIn()
  } catch (e) {
    return false
  }
}

function requirePermission(permission, options = {}) {
  if (!ensureParkAdmin()) return false
  if (hasPermission(permission)) return true
  if (!options.silent) {
    wx.showToast({ title: '无权访问该功能', icon: 'none' })
  }
  if (options.redirectHome) {
    wx.redirectTo({ url: '/packageAdmin/pages/home/index' })
  }
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
  hasPermission,
  requirePermission,
  isSuperActingAsPark,
  clearAuth,
}
