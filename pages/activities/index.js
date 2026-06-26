const { request } = require('../../utils/request')
const { formatDateTime } = require('../../utils/format')

Page({
  data: { list: [] },
  onShow() {
    request('/activities')
      .then((res) => {
        const list = (res.data || []).map((item) => ({
          ...item,
          timeText: `${formatDateTime(item.start_time)} - ${formatDateTime(item.end_time)}`,
        }))
        this.setData({ list })
      })
      .catch(() => this.setData({ list: [] }))
  },
  onDetail(e) {
    wx.navigateTo({ url: `/pages/activities/detail?id=${e.currentTarget.dataset.id}` })
  },
})
