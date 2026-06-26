const TOKEN_KEY = 'merchant_token'
const USER_KEY = 'merchant_user'

function setAuth(token, merchant) {
  wx.setStorageSync(TOKEN_KEY, token || '')
  wx.setStorageSync(USER_KEY, merchant || null)
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function getMerchantUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function isMerchantLoggedIn() {
  return !!getToken()
}

module.exports = {
  setAuth,
  clearAuth,
  getToken,
  getMerchantUser,
  isMerchantLoggedIn,
}
