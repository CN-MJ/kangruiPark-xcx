const { request } = require('../../utils/request')
const { getPhone, setPhone, getName, setName } = require('../../utils/user')

const TYPE_CONFIG = {
  venue: {
    title: '场馆预定',
    resources: ['会议室A', '会议室B', '羽毛球馆', '活动场地'],
  },
  visitor: {
    title: '访客预约',
  },
  activity: {
    title: '活动报备',
    resources: ['园区内活动', '户外市集', '企业开放日'],
  },
}

Page({
  data: {
    appointmentType: 'venue',
    pageTitle: '预约申请',
    resources: [],
    resourceIndex: 0,
    merchants: [],
    merchantNames: [],
    merchantIndex: 0,
    merchantsLoading: false,
    userName: '',
    userPhone: '',
    date: '',
    time: '09:00',
    submitting: false,
  },

  onLoad(options) {
    const type = options.type || 'venue'
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.venue
    wx.setNavigationBarTitle({ title: config.title })
    this.setData({
      appointmentType: type,
      pageTitle: config.title,
      resources: config.resources || [],
      userName: getName(),
      userPhone: getPhone(),
      date: this.getToday(),
    })

    if (type === 'visitor') {
      this.loadMerchants()
    }
  },

  getToday() {
    const d = new Date()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  },

  loadMerchants() {
    this.setData({ merchantsLoading: true })
    request('/merchants')
      .then((res) => {
        const merchants = res.data || []
        this.setData({
          merchants,
          merchantNames: merchants.map((item) => item.name),
          merchantIndex: 0,
          merchantsLoading: false,
        })
      })
      .catch((err) => {
        this.setData({ merchantsLoading: false })
        wx.showToast({ title: err.message || '加载公司列表失败', icon: 'none' })
      })
  },

  onNameInput(e) {
    this.setData({ userName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ userPhone: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value })
  },

  onResourceChange(e) {
    this.setData({ resourceIndex: Number(e.detail.value) })
  },

  onMerchantChange(e) {
    this.setData({ merchantIndex: Number(e.detail.value) })
  },

  onSubmit() {
    if (this.data.submitting) return

    const {
      appointmentType,
      userName,
      userPhone,
      date,
      time,
      resources,
      resourceIndex,
      merchants,
      merchantIndex,
    } = this.data

    if (!userName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!userPhone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    let payload = {
      user_name: userName.trim(),
      user_phone: userPhone.trim(),
      appointment_time: `${date} ${time}:00`,
    }

    if (appointmentType === 'visitor') {
      if (!merchants.length) {
        wx.showToast({ title: '暂无可选公司', icon: 'none' })
        return
      }
      payload.merchant_id = merchants[merchantIndex].id
    } else {
      payload.resource_name = resources[resourceIndex]
    }

    setName(userName.trim())
    setPhone(userPhone.trim())

    this.setData({ submitting: true })
    request('/appointments', {
      method: 'POST',
      data: payload,
    })
      .then((res) => {
        wx.showToast({ title: res.msg || '提交成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 1500)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '提交失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },
})
