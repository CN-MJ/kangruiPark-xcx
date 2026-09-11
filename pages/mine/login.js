const { wechatPhoneLogin } = require('../../utils/auth')
const { saveUserProfile } = require('../../utils/user')

const MOCK_PHONE_KEY = 'dev_mock_phone_seq'
const MOCK_PHONE_START = 13900001001

function peekMockPhone() {
  let n = Number(wx.getStorageSync(MOCK_PHONE_KEY) || MOCK_PHONE_START)
  if (!n || n < MOCK_PHONE_START) n = MOCK_PHONE_START
  return String(n)
}

function takeMockPhone() {
  const phone = peekMockPhone()
  wx.setStorageSync(MOCK_PHONE_KEY, Number(phone) + 1)
  return phone
}

Page({
  data: {
    submitting: false,
    mockHint: true,
    nextMockPhone: '',
  },

  onShow() {
    this.setData({ nextMockPhone: peekMockPhone() })
  },

  onGetPhoneNumber(e) {
    if (this.data.submitting) return
    const detail = e.detail || {}
    if (detail.errMsg && detail.errMsg.indexOf('ok') === -1) {
      wx.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
      return
    }
    const phoneCode = detail.code
    if (!phoneCode) {
      wx.showToast({ title: '未获取到授权码，请使用下方开发登录', icon: 'none' })
      return
    }
    this.doLogin(phoneCode)
  },

  onMockLogin() {
    if (this.data.submitting) return
    const phone = takeMockPhone()
    this.setData({ nextMockPhone: peekMockPhone() })
    this.doLogin(`MOCK:${phone}`)
  },

  doLogin(phoneCode) {
    this.setData({ submitting: true })
    wechatPhoneLogin(phoneCode)
      .then((res) => {
        saveUserProfile(res.data)
        wx.showToast({ title: res.msg || '登录成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 500)
      })
      .catch((err) => wx.showToast({ title: err.message || '登录失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
