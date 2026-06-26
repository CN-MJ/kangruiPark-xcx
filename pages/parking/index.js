const { request } = require('../../utils/request')
const { formatDateTime } = require('../../utils/format')

const LAST_PLATE_KEY = 'parking_last_plate'

function normalizePlate(plate) {
  return (plate || '').replace(/\s+/g, '').toUpperCase()
}

Page({
  data: {
    stats: null,
    mode: 'entry',
    plateNumber: '',
    activeRecord: null,
    loading: false,
  },

  onShow() {
    this.loadStats()
    const lastPlate = wx.getStorageSync(LAST_PLATE_KEY) || ''
    if (lastPlate && !this.data.plateNumber) {
      this.setData({ plateNumber: lastPlate })
    }
  },

  loadStats() {
    request('/parking/remaining')
      .then((res) => {
        this.setData({ stats: res.data })
      })
      .catch(() => {
        this.setData({ stats: null })
      })
  },

  onModeChange(e) {
    const { mode } = e.currentTarget.dataset
    if (mode === this.data.mode) return
    this.setData({ mode, activeRecord: null })
    if (mode === 'exit' && normalizePlate(this.data.plateNumber)) {
      this.onQueryActive()
    }
  },

  onPlateInput(e) {
    const plateNumber = normalizePlate(e.detail.value)
    this.setData({ plateNumber, activeRecord: null })
  },

  onQueryActive() {
    const plateNumber = normalizePlate(this.data.plateNumber)
    if (!plateNumber) {
      wx.showToast({ title: '请输入车牌号', icon: 'none' })
      return
    }

    request('/parking/active', { data: { plate_number: plateNumber } })
      .then((res) => {
        this.setData({
          activeRecord: {
            ...res.data,
            entryText: formatDateTime(res.data.entry_time),
          },
        })
      })
      .catch((err) => {
        this.setData({ activeRecord: null })
        wx.showToast({ title: err.message || '未找到在场记录', icon: 'none' })
      })
  },

  onSubmit() {
    if (this.data.loading) return

    const plateNumber = normalizePlate(this.data.plateNumber)
    if (!plateNumber) {
      wx.showToast({ title: '请输入车牌号', icon: 'none' })
      return
    }

    if (this.data.mode === 'exit') {
      this.submitExit(plateNumber)
      return
    }

    this.setData({ loading: true })
    request('/parking/entry', {
      method: 'POST',
      data: { plate_number: plateNumber },
    })
      .then((res) => {
        wx.setStorageSync(LAST_PLATE_KEY, plateNumber)
        this.setData({ loading: false, plateNumber: '' })
        wx.showToast({ title: res.msg || '入场成功', icon: 'success' })
        this.loadStats()
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '入场失败', icon: 'none' })
      })
  },

  submitExit(plateNumber) {
    wx.showModal({
      title: '确认出场',
      content: `确定为车牌 ${plateNumber} 办理出场吗？`,
      success: (res) => {
        if (!res.confirm) return

        this.setData({ loading: true })
        request('/parking/exit', {
          method: 'POST',
          data: { plate_number: plateNumber },
        })
          .then((result) => {
            wx.setStorageSync(LAST_PLATE_KEY, plateNumber)
            this.setData({ loading: false, activeRecord: null })
            wx.showToast({ title: result.msg || '出场成功', icon: 'success' })
            this.loadStats()
          })
          .catch((err) => {
            this.setData({ loading: false })
            wx.showToast({ title: err.message || '出场失败', icon: 'none' })
          })
      },
    })
  },
})
