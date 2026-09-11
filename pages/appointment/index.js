const nav = require('../../utils/nav')

const SERVICES = [
  {
    id: 'visitor',
    title: '访客预约',
    desc: '拜访园区入驻企业，需商户确认',
    icon: 'visitor',
    tone: 'blue',
  },
  {
    id: 'venue',
    title: '场馆预定',
    desc: '会议室、活动场地在线预约',
    icon: 'venue',
    tone: 'green',
  },
  {
    id: 'activity',
    title: '活动报备',
    desc: '园区内活动、市集等报备申请',
    icon: 'clipboard',
    tone: 'amber',
  },
  {
    id: 'appointment_query',
    title: '预约查询',
    desc: '按手机号查看预约状态与取消',
    icon: 'search',
    tone: 'gray',
  },
]

Page({
  data: {
    services: SERVICES,
  },

  onItemTap(e) {
    nav.go(e.currentTarget.dataset.id)
  },
})
