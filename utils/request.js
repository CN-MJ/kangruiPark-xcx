const { API_BASE_URL } = require('./config')
const { getToken } = require('./parkAuth')
const { getToken: getMerchantToken } = require('./merchantAuth')
const { getToken: getUserToken } = require('./userAuth')

const REQUEST_TIMEOUT = 15000

function parseNetworkError(err) {
  const msg = (err && err.errMsg) || ''
  if (msg.includes('timeout')) {
    return new Error('请求超时，请确认后端已启动')
  }
  if (msg.includes('fail') || msg.includes('connect')) {
    return new Error(`无法连接服务器，请检查 API 地址：${API_BASE_URL}`)
  }
  return new Error(msg || '网络错误')
}

function request(url, options = {}) {
  const { method = 'GET', data = {}, auth = false, timeout = REQUEST_TIMEOUT, header: customHeader = {} } = options
  const header = {
    'content-type': 'application/json',
    ...customHeader,
  }

  if (auth) {
    const token = getToken()
    if (token) {
      header.Authorization = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header,
      timeout,
      success(res) {
        if (res.statusCode === 401 && auth) {
          reject(new Error('登录已过期'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.code === 200) {
          resolve(res.data)
          return
        }
        const msg = (res.data && res.data.msg) || '请求失败'
        reject(new Error(msg))
      },
      fail(err) {
        reject(parseNetworkError(err))
      },
    })
  })
}

function parkRequest(url, options = {}) {
  const { method = 'GET', data = {}, timeout = REQUEST_TIMEOUT, header: customHeader = {} } = options
  const header = { ...customHeader }
  let token = getToken()

  // 有园区 token：绝不使用超管 token（避免静默冒充）
  // 无园区 token 且已升权：显式代管头访问园区接口
  if (!token) {
    try {
      const superAuth = require('./superAuth')
      if (superAuth.isSuperLoggedIn()) {
        token = superAuth.getToken()
        header['X-Park-Act-As'] = '1'
      }
    } catch (e) {}
  }

  return request(url, {
    method,
    data,
    timeout,
    auth: false,
    header: {
      ...header,
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}

function merchantRequest(url, options = {}) {
  const { method = 'GET', data = {}, timeout = REQUEST_TIMEOUT } = options
  const token = getMerchantToken()
  return request(url, {
    method,
    data,
    timeout,
    auth: false,
    header: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}

function userRequest(url, options = {}) {
  const { method = 'GET', data = {}, timeout = REQUEST_TIMEOUT } = options
  const token = getUserToken()
  return request(url, {
    method,
    data,
    timeout,
    auth: false,
    header: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  }).catch((err) => {
    if (err.message && (err.message.includes('微信授权') || err.message.includes('手机号'))) {
      const { setPhoneVerified } = require('./user')
      const userAuth = require('./userAuth')
      setPhoneVerified(false)
      userAuth.clearToken()
    }
    throw err
  })
}

function superRequest(url, options = {}) {
  const { method = 'GET', data = {}, timeout = REQUEST_TIMEOUT } = options
  const { getToken: getSuperToken } = require('./superAuth')
  const token = getSuperToken()
  return request(url, {
    method,
    data,
    timeout,
    auth: false,
    header: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}

module.exports = {
  request,
  parkRequest,
  merchantRequest,
  userRequest,
  superRequest,
  parseNetworkError,
}
