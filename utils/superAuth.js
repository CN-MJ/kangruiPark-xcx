const TOKEN_KEY = 'super_token'
const USER_KEY = 'super_user'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token)
}

function setUser(user) {
  if (user) wx.setStorageSync(USER_KEY, user)
}

function getUser() {
  return wx.getStorageSync(USER_KEY) || null
}

function setAuth(token, user) {
  setToken(token)
  setUser(user)
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_KEY)
}

function isSuperLoggedIn() {
  return !!getToken()
}

module.exports = {
  getToken,
  setToken,
  setUser,
  getUser,
  setAuth,
  clearToken,
  isSuperLoggedIn,
}
