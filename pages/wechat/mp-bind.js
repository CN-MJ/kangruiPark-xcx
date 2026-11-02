const {
  buildAuthPageUrl,
  copyAuthLinkAndTip,
} = require('../../utils/wechatMp')
const { drawQrcode } = require('../../utils/qrcode')
const { SERVER_BASE_URL } = require('../../utils/config')
const { request } = require('../../utils/request')
const { setHasMpOpenid } = require('../../utils/user')

Page({
  data: {
    type: 'visitor',
    phone: '',
    merchantId: 0,
    fromAppointment: false,
    authUrl: '',
    qrImagePath: '',
    followQrUrl: '',
    loadError: '',
    qrError: false,
    qrErrorMsg: '',
    followQrError: false,
    polling: false,
    complete: false,
  },

  _timer: null,
  _pollCount: 0,

  onLoad(options) {
    const type = options.type === 'merchant' ? 'merchant' : 'visitor'
    const phone = options.phone ? decodeURIComponent(String(options.phone)) : ''
    const merchantId = options.id ? Number(options.id) : 0
    const from = options.from ? decodeURIComponent(String(options.from)) : ''
    const fromAppointment = from === 'appointment'

    let authUrl = ''
    let loadError = ''
    try {
      if (type === 'merchant') {
        if (!merchantId) loadError = '缺少商户账号信息'
        else authUrl = buildAuthPageUrl({ type: 'merchant', merchantId })
      } else if (!phone) {
        loadError = '缺少手机号，请先登录后再试'
      } else {
        authUrl = buildAuthPageUrl({ type: 'visitor', phone })
      }
    } catch (e) {
      loadError = '授权地址生成失败，请稍后重试'
    }

    if (authUrl) authUrl = String(authUrl).replace(/&amp;/g, '&')

    const base = String(SERVER_BASE_URL || '').replace(/\/$/, '')
    const followQrUrl = base ? `${base}/wechat/qrcode?t=${Date.now()}` : ''

    this.setData({
      type,
      phone,
      merchantId,
      fromAppointment,
      authUrl,
      loadError,
      qrImagePath: '',
      followQrUrl,
      qrError: false,
      qrErrorMsg: '',
      followQrError: false,
      complete: false,
      polling: false,
    })

    wx.setNavigationBarTitle({
      title: fromAppointment ? '开启预约通知' : '消息通知授权',
    })

    if (!loadError) {
      setTimeout(() => this.renderAuthQr(), 100)
      this.checkOnce().then((done) => {
        if (!done) this.startPoll()
      })
    }
  },

  onUnload() {
    this.stopPoll()
  },

  onShow() {
    if (!this.data.complete && !this.data.loadError) {
      this.checkOnce().then((done) => {
        if (!done && !this._timer) this.startPoll()
      })
    }
  },

  renderAuthQr() {
    const text = this.data.authUrl
    if (!text) return

    drawQrcode({
      canvasId: 'authQrCanvas',
      text,
      size: 420,
      padding: 16,
    })
      .then(() => {
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'authQrCanvas',
            width: 420,
            height: 420,
            destWidth: 840,
            destHeight: 840,
            success: (res) => {
              this.setData({
                qrImagePath: res.tempFilePath,
                qrError: false,
                qrErrorMsg: '',
              })
            },
            fail: () => {
              this.setData({
                qrError: true,
                qrErrorMsg: '二维码显示失败，请点下方「复制链接打开」',
              })
            },
          })
        }, 80)
      })
      .catch(() => {
        this.setData({
          qrError: true,
          qrErrorMsg: '二维码生成失败，请点下方「复制链接打开」',
        })
      })
  },

  onQrError() {
    this.setData({
      qrError: true,
      qrErrorMsg: '二维码显示失败，请点下方「复制链接打开」',
    })
  },

  onFollowQrError() {
    this.setData({ followQrError: true })
  },

  startPoll() {
    this.stopPoll()
    this._pollCount = 0
    this.setData({ polling: true })
    this._timer = setInterval(() => this.checkOnce(), 2500)
  },

  stopPoll() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  checkOnce() {
    if (this.data.complete) return Promise.resolve(true)

    this._pollCount += 1
    if (this._pollCount > 60) {
      this.stopPoll()
      this.setData({ polling: false })
      return Promise.resolve(false)
    }

    const { type, phone, merchantId } = this.data
    const data =
      type === 'merchant'
        ? { type: 'merchant', merchant_id: merchantId }
        : { type: 'visitor', phone }

    return request('/wechat/check-bind', { method: 'GET', data })
      .then((res) => {
        const payload = (res && res.data) || {}
        const complete = !!(payload.complete || payload.bound)
        if (complete) {
          this.stopPoll()
          this.setData({ complete: true, polling: false })
          if (type !== 'merchant') setHasMpOpenid(true)
          wx.showToast({ title: '授权成功', icon: 'success' })
          return true
        }
        return false
      })
      .catch(() => false)
  },

  onRecheck() {
    wx.showLoading({ title: '检测中', mask: true })
    this._pollCount = 0
    this.checkOnce()
      .then((done) => {
        wx.hideLoading()
        if (!done) {
          wx.showToast({
            title: '还未授权，请先长按识别二维码',
            icon: 'none',
            duration: 2500,
          })
          if (!this._timer) this.startPoll()
        }
      })
      .catch(() => wx.hideLoading())
  },

  onCopyLink() {
    let url = this.data.authUrl
    if (!url) {
      wx.showToast({ title: '链接无效', icon: 'none' })
      return
    }
    url = String(url).replace(/&amp;/g, '&')
    copyAuthLinkAndTip(
      url,
      '链接已复制。请到微信「文件传输助手」粘贴打开，完成授权后回到本页点「我已授权，检测一下」。'
    )
      .then(() => {
        if (!this._timer && !this.data.complete) this.startPoll()
      })
      .catch(() => wx.showToast({ title: '复制失败', icon: 'none' }))
  },

  onSkip() {
    this.stopPoll()
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.switchTab({ url: '/pages/mine/index' })
  },
})
