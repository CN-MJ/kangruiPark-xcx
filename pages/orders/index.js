const { request } = require('../../utils/request')
const { formatDateTime } = require('../../utils/format')
const { getPhone, setPhone } = require('../../utils/user')

Page({
  data: {
    phone: '',
    list: [],
    loading: false,
  },

  onShow() {
    const phone = getPhone()
    this.setData({ phone })
    if (phone) {
      this.loadList()
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onSearch() {
    const phone = this.data.phone.trim()
    if (!phone) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    setPhone(phone)
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    request('/appointments', { data: { user_phone: this.data.phone } })
      .then((res) => {
        const list = (res.data || []).map((item) => ({
          ...item,
          timeText: formatDateTime(item.appointment_time),
          statusText: item.status_text || ({ 0: '待确认', 1: '已确认', 2: '已拒绝', 3: '已取消' }[item.status] || '待确认'),
          statusClass: item.status === 1 ? 'tag-active' : 'tag-cancelled',
          displayTitle: item.merchant ? `拜访 ${item.resource_name}` : item.resource_name,
          locationText: item.merchant && item.merchant.location ? item.merchant.location : '',
        }))
        this.setData({ list, loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false, list: [] })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onCancel(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '取消预约',
      content: '确定要取消这条预约吗？',
      success: (res) => {
        if (!res.confirm) return
        request(`/appointments/${id}/cancel`, { method: 'PATCH' })
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'success' })
            this.loadList()
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' })
          })
      },
    })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/appointment/index' })
  },
})
