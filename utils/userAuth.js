const TOKEN_KEY = 'user_token'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) {
    wx.setStorageSync(TOKEN_KEY, token)
  }
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY)
}

function isLoggedIn() {
  return !!getToken()
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
}
