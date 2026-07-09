const { parkRequest } = require('../../../utils/request')
const parkAuth = require('../../../utils/parkAuth')
const { applyParkNavTheme } = require('../../utils/navTheme')
const { formatAttendees, formatDateTimeShort } = require('../../utils/cms')

Page({
  data: {
    activityId: '',
    activity: null,
    list: [],
    loading: true,
  },

  onLoad(options) {
    if (!options.id) return
    this.setData({ activityId: options.id })
  },

  onShow() {
    applyParkNavTheme()
    if (!parkAuth.isParkLoggedIn()) {
      wx.redirectTo({ url: '/packageAdmin/pages/login/index' })
      return
    }
    if (this.data.activityId) this.loadData()
  },

  loadData() {
    this.setData({ loading: true })
    parkRequest(`/park/activities/${this.data.activityId}/registrations`)
      .then((res) => {
        const data = res.data || {}
        const activity = data.activity || {}
        this.setData({
          activity: {
            ...activity,
            timeText: formatDateTimeShort(activity.start_time),
            attendeesText: formatAttendees(activity.registered_count, activity.max_attendees),
          },
          list: (data.list || []).map((item) => ({
            ...item,
            createdText: formatDateTimeShort(item.created_at),
          })),
          loading: false,
        })
        wx.setNavigationBarTitle({ title: `报名名单` })
      })
      .catch((err) => {
        this.setData({ loading: false })
        wx.showToast({ title: err.message || '加载失败', icon: 'none' })
      })
  },
})
