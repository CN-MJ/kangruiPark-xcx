const { request } = require('../../utils/request')

const STATUS_MAP = { 0: '报名中', 1: '已结束', 2: '已取消' }

function formatAttendees(registered, max) {
  const reg = Number(registered || 0)
  const cap = Number(max || 0)
  return cap > 0 ? `${reg} / ${cap}` : `${reg} / 不限`
}

Page({
  data: {
    detail: null,
    contact_name: '',
    contact_phone: '',
    canRegister: false,
    statusText: '',
    attendeesText: '',
  },

  onLoad(options) {
    if (options.id) this.loadDetail(options.id)
  },

  loadDetail(id) {
    request(`/activities/${id}`)
      .then((res) => {
        const detail = res.data
        const max = Number(detail.max_attendees || 0)
        const registered = Number(detail.registered_count || 0)
        const isOpen = detail.status === 0
        const notFull = max === 0 || registered < max
        this.setData({
          detail,
          canRegister: isOpen && notFull,
          statusText: STATUS_MAP[detail.status] || '未知',
          attendeesText: formatAttendees(registered, max),
        })
      })
      .catch((err) => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
  },

  onInput(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value })
  },

  onRegister() {
    const { detail, contact_name, contact_phone, canRegister } = this.data
    if (!detail || !canRegister) return
    if (!contact_name.trim() || !contact_phone.trim()) {
      wx.showToast({ title: '请填写联系人和手机号', icon: 'none' })
      return
    }
    request(`/activities/${detail.id}/register`, {
      method: 'POST',
      data: { contact_name: contact_name.trim(), contact_phone: contact_phone.trim() },
    })
      .then(() => {
        wx.showToast({ title: '报名成功', icon: 'success' })
        this.loadDetail(detail.id)
      })
      .catch((err) => wx.showToast({ title: err.message || '报名失败', icon: 'none' }))
  },
})
