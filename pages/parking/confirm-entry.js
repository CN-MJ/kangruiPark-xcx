const { formatDateTime } = require('../../utils/format')
const { getPendingEvents, confirmEntry } = require('../../utils/vehicle')
const userAuth = require('../../utils/userAuth')
const { getPhone } = require('../../utils/user')

Page({
  data: {
    event: null,
    loading: true,
    submitting: false,
    recognitionText: '',
  },

  onLoad(options) {
    const eventId = options.event_id ? Number(options.event_id) : 0
    this.eventId = eventId
    this.loadEvent()
  },

  loadEvent() {
    if (!getPhone() || !userAuth.isLoggedIn()) {
      this.setData({ loading: false })
      wx.showToast({ title: '请先绑定手机号', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    getPendingEvents()
      .then((data) => {
        const list = data.list || []
        const event = this.eventId
          ? list.find((item) => item.id === this.eventId && item.direction === 1)
          : list.find((item) => item.direction === 1)

        if (!event) {
          this.setData({ event: null, loading: false })
          return
        }

        this.setData({
          event,
          loading: false,
          recognitionText: formatDateTime(event.recognition_time),
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onConfirm() {
    if (this.data.submitting || !this.data.event) return

    this.setData({ submitting: true })
    confirmEntry(this.data.event.id)
      .then((res) => {
        wx.showToast({ title: res.msg || '入场成功', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '确认失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  onCancel() {
    wx.navigateBack()
  },
})
