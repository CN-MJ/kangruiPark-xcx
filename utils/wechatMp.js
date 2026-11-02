const { SERVER_BASE_URL } = require('./config')
const { request } = require('./request')
const { setHasMpOpenid } = require('./user')

/**
 * 服务号 OAuth state（与后端 WeChatBindState 一致）
 * 访客：type:visitor,phone:13800000000
 * 商户：type:merchant,id:1
 */
function buildVisitorState(phone) {
  const p = String(phone || '').trim()
  return `type:visitor,phone:${p}`
}

function buildMerchantState(merchantId) {
  return `type:merchant,id:${Number(merchantId) || 0}`
}

/**
 * 打开本站 H5 授权页；页面会自行把 state 塞进微信 OAuth。
 * 访客：/wechat/auth?type=visitor&phone=13800000000
 * 商户：/wechat/auth?type=merchant&id=1
 */
function buildAuthPageUrl({ type, phone, merchantId, redirectUrl } = {}) {
  const base = String(SERVER_BASE_URL || '').replace(/\/$/, '')
  const query = []
  if (type === 'merchant') {
    query.push('type=merchant')
    query.push(`id=${encodeURIComponent(Number(merchantId) || 0)}`)
  } else {
    query.push('type=visitor')
    query.push(`phone=${encodeURIComponent(String(phone || '').trim())}`)
  }
  if (redirectUrl) {
    query.push(`redirect_url=${encodeURIComponent(redirectUrl)}`)
  }
  return `${base}/wechat/auth?${query.join('&')}`
}

/**
 * 服务号 OAuth 会跳到 open.weixin.qq.com，小程序 web-view 必然「不支持打开」。
 * 关注：小程序内展示二维码长按识别；绑定 openid：复制链接到微信打开。
 */
function canUseWebView() {
  return false
}

function openMpBindPage(options = {}) {
  const type = options.type === 'merchant' ? 'merchant' : 'visitor'
  const parts = [`type=${type}`]
  if (type === 'merchant') {
    parts.push(`id=${encodeURIComponent(Number(options.merchantId) || 0)}`)
  } else {
    parts.push(`phone=${encodeURIComponent(String(options.phone || '').trim())}`)
  }
  if (options.from) {
    parts.push(`from=${encodeURIComponent(options.from)}`)
  }
  const url = `/pages/wechat/mp-bind?${parts.join('&')}`
  const nav = options.replace ? wx.redirectTo : wx.navigateTo
  return new Promise((resolve, reject) => {
    nav({
      url,
      success: resolve,
      fail: (err) => {
        // redirect 失败时回退 navigate
        if (options.replace) {
          wx.navigateTo({ url, success: resolve, fail: reject })
          return
        }
        reject(err)
      },
    })
  })
}

function openVisitorMpBind({ phone, from, replace } = {}) {
  return openMpBindPage({ type: 'visitor', phone, from, replace })
}

function openMerchantMpBind({ merchantId, from, replace } = {}) {
  return openMpBindPage({ type: 'merchant', merchantId, from, replace })
}

/**
 * 查询是否已绑定服务号 openid
 * @returns {Promise<{bound: boolean, complete: boolean}>}
 */
function checkMpBindStatus({ type, phone, merchantId } = {}) {
  const t = type === 'merchant' ? 'merchant' : 'visitor'
  const data =
    t === 'merchant'
      ? { type: 'merchant', merchant_id: Number(merchantId) || 0 }
      : { type: 'visitor', phone: String(phone || '').trim() }

  return request('/wechat/check-bind', { method: 'GET', data })
    .then((res) => {
      const payload = (res && res.data) || {}
      const bound = !!(payload.complete || payload.bound)
      if (bound && t === 'visitor') setHasMpOpenid(true)
      return { bound, complete: bound }
    })
    .catch(() => ({ bound: false, complete: false }))
}

/**
 * 未绑定时才打开授权页；已绑定则直接跳过（预约成功后不再弹出）。
 */
function openVisitorMpBindIfNeeded({ phone, from, replace } = {}) {
  const p = String(phone || '').trim()
  if (!p) {
    return Promise.reject(new Error('缺少手机号'))
  }

  return checkMpBindStatus({ type: 'visitor', phone: p }).then((status) => {
    if (status.bound) {
      return { skipped: true, bound: true }
    }
    return openVisitorMpBind({ phone: p, from, replace }).then(() => ({
      skipped: false,
      bound: false,
    }))
  })
}

function openMerchantMpBindIfNeeded({ merchantId, from, replace } = {}) {
  const id = Number(merchantId) || 0
  if (!id) {
    return Promise.reject(new Error('缺少商户 ID'))
  }

  return checkMpBindStatus({ type: 'merchant', merchantId: id }).then((status) => {
    if (status.bound) {
      return { skipped: true, bound: true }
    }
    return openMerchantMpBind({ merchantId: id, from, replace }).then(() => ({
      skipped: false,
      bound: false,
    }))
  })
}

/**
 * 复制授权链接并提示（备用方式）
 */
function copyAuthLinkAndTip(url, tip) {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: url,
      success() {
        wx.showModal({
          title: '链接已复制',
          content: tip || '请到微信「文件传输助手」粘贴打开完成授权，然后回到小程序点「我已授权，检测一下」。',
          showCancel: false,
          confirmText: '知道了',
        })
        resolve(url)
      },
      fail: reject,
    })
  })
}

function bindVisitorMpOpenid(phone) {
  return openVisitorMpBind({ phone, from: 'mine' })
}

function bindMerchantMpOpenid(merchantId) {
  return openMerchantMpBind({ merchantId, from: 'merchant' })
}

module.exports = {
  buildVisitorState,
  buildMerchantState,
  buildAuthPageUrl,
  canUseWebView,
  openMpBindPage,
  openVisitorMpBind,
  openMerchantMpBind,
  openVisitorMpBindIfNeeded,
  openMerchantMpBindIfNeeded,
  checkMpBindStatus,
  copyAuthLinkAndTip,
  bindVisitorMpOpenid,
  bindMerchantMpOpenid,
}
