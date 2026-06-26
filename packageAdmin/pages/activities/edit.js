const { parkRequest } = require('../../../utils/request')
const { uploadImage } = require('../../../utils/upload')

Page({
  data: {
    id: '',
    title: '',
    cover_image: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
    max_attendees: 0,
    status: 0,
    startDate: '',
    startClock: '09:00',
    endDate: '',
    endClock: '18:00',
    submitting: false,
  },
  onLoad(options) {
    const today = this.getToday()
    this.setData({ startDate: today, endDate: today })
    if (!options.id) return
    this.setData({ id: options.id })
    parkRequest(`/park/activities/${options.id}`).then((res) => {
      const d = res.data
      this.setData({
        ...d,
        startDate: this.getDatePart(d.start_time),
        startClock: this.getTimePart(d.start_time),
        endDate: this.getDatePart(d.end_time),
        endClock: this.getTimePart(d.end_time),
      })
    })
  },
  getToday() {
    const d = new Date()
    const m = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  },
  getDatePart(datetime) {
    return (datetime || '').slice(0, 10) || this.getToday()
  },
  getTimePart(datetime) {
    return (datetime || '').slice(11, 16) || '09:00'
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }) },
  onStatusChange(e) { this.setData({ status: Number(e.detail.value) }) },
  onDateChange(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [key]: e.detail.value })
  },
  onTimeChange(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [key]: e.detail.value })
  },
  onChooseCover() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: (res) => uploadImage(res.tempFiles[0].tempFilePath).then((url) => this.setData({ cover_image: url })) })
  },
  onSubmit() {
    if (this.data.submitting) return
    const start_time = `${this.data.startDate} ${this.data.startClock}:00`
    const end_time = `${this.data.endDate} ${this.data.endClock}:00`
    if (!this.data.title.trim()) return wx.showToast({ title: '请填写活动标题', icon: 'none' })
    if (!this.data.location.trim()) return wx.showToast({ title: '请填写活动地点', icon: 'none' })
    if (!this.data.description.trim()) return wx.showToast({ title: '请填写活动描述', icon: 'none' })
    if (new Date(end_time).getTime() < new Date(start_time).getTime()) {
      return wx.showToast({ title: '结束时间不能早于开始时间', icon: 'none' })
    }
    const data = {
      title: this.data.title.trim(),
      cover_image: this.data.cover_image || null,
      start_time,
      end_time,
      location: this.data.location.trim(),
      description: this.data.description.trim(),
      max_attendees: Number(this.data.max_attendees || 0),
      status: Number(this.data.status || 0),
    }
    const req = this.data.id ? parkRequest(`/park/activities/${this.data.id}`, { method: 'PUT', data }) : parkRequest('/park/activities', { method: 'POST', data })
    this.setData({ submitting: true })
    req
      .then(() => { wx.showToast({ title: '保存成功', icon: 'success' }); setTimeout(() => wx.navigateBack(), 500) })
      .finally(() => this.setData({ submitting: false }))
  },
})
