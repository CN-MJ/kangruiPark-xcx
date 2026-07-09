const { formatDateTime } = require('../../utils/format')
const { getPendingEvents, confirmExit } = require('../../utils/vehicle')
const userAuth = require('../../utils/userAuth')
const { getPhone } = require('../../utils/user')

function formatDuration(entryTime) {
  if (!entryTime) return '--'
  const start = new Date(entryTime).getTime()
  const diff = Math.max(0, Date.now() - start)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

Page({
  data: {
    event: null,
    loading: true,
    submitting: false,
    recognitionText: '',
    entryText: '',
    stayText: '',
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
          ? list.find((item) => item.id === this.eventId && item.direction === 2)
          : list.find((item) => item.direction === 2)

        if (!event) {
          this.setData({ event: null, loading: false })
          return
        }

        const entryTime = event.entry_time || null
        this.setData({
          event,
          loading: false,
          recognitionText: formatDateTime(event.recognition_time),
          entryText: entryTime ? formatDateTime(entryTime) : '暂无记录',
          stayText: formatDuration(entryTime),
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
    confirmExit(this.data.event.id)
      .then((res) => {
        wx.showToast({ title: res.msg || '出场成功', icon: 'success' })
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
