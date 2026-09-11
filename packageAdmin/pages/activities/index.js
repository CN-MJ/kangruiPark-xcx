const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { ACTIVITY_STATUS, formatAttendees, formatDateTimeShort } = require('../../utils/cms')

Page({
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    statusFilter: '',
    statusTabs: ['全部', ...ACTIVITY_STATUS],
    statusFilterIndex: 0,
    activityStatuses: ACTIVITY_STATUS,
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.canAccessParkAdmin()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    this.loadList()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadList(true)
  },

  onStatusFilter(e) {
    const index = Number(e.detail.value)
    this.setData({
      statusFilterIndex: index,
      statusFilter: index === 0 ? '' : String(index - 1),
      page: 1,
      list: [],
      hasMore: true,
    })
    this.loadList()
  },

  loadList(loadMore = false) {
    if (this.data.loading) return
    const page = loadMore ? this.data.page + 1 : 1
    const params = { page }
    if (this.data.statusFilter !== '') params.status = this.data.statusFilter

    this.setData({ loading: true })
    parkRequest('/park/activities', { data: params })
      .then((res) => {
        const payload = res.data || {}
        const rows = (payload.data || []).map((item) => ({
          ...item,
          timeText: `${formatDateTimeShort(item.start_time)} ~ ${formatDateTimeShort(item.end_time)}`,
          attendeesText: formatAttendees(item.registered_count, item.max_attendees),
          statusText: ACTIVITY_STATUS[item.status] || '未知',
          statusClass: item.status === 0 ? 'open' : item.status === 1 ? 'done' : 'cancel',
        }))
        this.setData({
          list: loadMore ? this.data.list.concat(rows) : rows,
          page,
          hasMore: page < (payload.last_page || 1),
          loading: false,
        })
      })
      .catch(() => this.setData({ loading: false }))
  },

  onCreate() {
    wx.navigateTo({ url: '/packageAdmin/pages/activities/edit' })
  },

  onEdit(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/activities/edit?id=${e.currentTarget.dataset.id}` })
  },

  onRegistrations(e) {
    wx.navigateTo({ url: `/packageAdmin/pages/activities/registrations?id=${e.currentTarget.dataset.id}` })
  },

  onDelete(e) {
    const { id, title } = e.currentTarget.dataset
    wx.showModal({
      title: '删除活动',
      content: `确定删除「${title}」吗？报名记录将一并删除。`,
      success: (res) => {
        if (!res.confirm) return
        parkRequest(`/park/activities/${id}`, { method: 'DELETE' }).then(() => {
          wx.showToast({ title: '已删除', icon: 'success' })
          this.setData({ page: 1, list: [], hasMore: true })
          this.loadList()
        })
      },
    })
  },
})
