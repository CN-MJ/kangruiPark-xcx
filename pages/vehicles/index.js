const { getVehicles, bindVehicle, unbindVehicle, setDefaultVehicle } = require('../../utils/vehicle')
const { requirePhoneVerified } = require('../../utils/user')

function normalizePlate(plate) {
  return (plate || '').replace(/\s+/g, '').toUpperCase()
}

Page({
  data: {
    list: [],
    loading: true,
    plateInput: '',
    submitting: false,
    needVerify: false,
  },

  onShow() {
    if (!requirePhoneVerified({ redirect: false })) {
      this.setData({ loading: false, list: [], needVerify: true })
      wx.showModal({
        title: '需要微信授权',
        content: '绑定车辆前请先微信授权手机号登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/mine/login' })
          }
        },
      })
      return
    }

    this.setData({ needVerify: false })
    this.loadList()
  },

  loadList() {
    this.setData({ loading: true })
    getVehicles()
      .then((list) => {
        this.setData({ list: list || [], loading: false })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },

  onPlateInput(e) {
    this.setData({ plateInput: normalizePlate(e.detail.value) })
  },

  onBind() {
    if (this.data.submitting || this.data.needVerify) return

    const plate = normalizePlate(this.data.plateInput)
    if (!plate) {
      wx.showToast({ title: '请输入车牌号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    bindVehicle(plate, this.data.list.length === 0)
      .then(() => {
        wx.showToast({ title: '绑定成功', icon: 'success' })
        this.setData({ plateInput: '' })
        this.loadList()
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '绑定失败', icon: 'none' })
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  onSetDefault(e) {
    const { id } = e.currentTarget.dataset
    setDefaultVehicle(id)
      .then(() => {
        wx.showToast({ title: '已设为默认', icon: 'success' })
        this.loadList()
      })
      .catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' })
      })
  },

  onUnbind(e) {
    const { id, plate } = e.currentTarget.dataset
    wx.showModal({
      title: '解绑车辆',
      content: `确定解绑车牌 ${plate} 吗？`,
      success: (res) => {
        if (!res.confirm) return
        unbindVehicle(id)
          .then(() => {
            wx.showToast({ title: '已解绑', icon: 'success' })
            this.loadList()
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '解绑失败', icon: 'none' })
          })
      },
    })
  },

  goBindPhone() {
    wx.navigateTo({ url: '/pages/mine/login' })
  },
})
