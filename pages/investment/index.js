const { request } = require('../../utils/request')

Page({
  data: {
    houses: [],
    houseTitles: ['暂不指定房源'],
    houseIndex: 0,
    company_name: '',
    contact_name: '',
    contact_phone: '',
    demand_area: '',
    message: '',
    submitting: false,
  },

  onLoad(options) {
    this.loadHouses(options.house_id)
  },

  loadHouses(defaultHouseId) {
    request('/houses')
      .then((res) => {
        const houses = res.data || []
        let houseIndex = 0
        if (defaultHouseId) {
          const idx = houses.findIndex((h) => String(h.id) === String(defaultHouseId))
          if (idx >= 0) houseIndex = idx + 1
        }
        this.setData({
          houses,
          houseTitles: ['暂不指定房源'].concat(houses.map((h) => h.title)),
          houseIndex,
        })
      })
      .catch(() => {})
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onHouseChange(e) {
    this.setData({ houseIndex: Number(e.detail.value) })
  },

  onSubmit() {
    if (this.data.submitting) return
    const payload = {
      company_name: this.data.company_name.trim(),
      contact_name: this.data.contact_name.trim(),
      contact_phone: this.data.contact_phone.trim(),
      demand_area: this.data.demand_area.trim(),
      message: this.data.message.trim(),
      source: '小程序',
    }
    if (!payload.company_name || !payload.contact_name || !payload.contact_phone || !payload.demand_area) {
      wx.showToast({ title: '请完善必填信息', icon: 'none' })
      return
    }
    if (this.data.houseIndex > 0) {
      payload.house_id = this.data.houses[this.data.houseIndex - 1].id
    }
    this.setData({ submitting: true })
    request('/investment/intent', { method: 'POST', data: payload })
      .then(() => wx.redirectTo({ url: '/pages/investment/success' }))
      .catch((err) => wx.showToast({ title: err.message || '提交失败', icon: 'none' }))
      .finally(() => this.setData({ submitting: false }))
  },
})
