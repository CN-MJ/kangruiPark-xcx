const PARK_NAV_BG = '#003791'

function applyParkNavTheme() {
  wx.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: PARK_NAV_BG,
    animation: {
      duration: 0,
      timingFunc: 'easeIn',
    },
  })
}

module.exports = {
  PARK_NAV_BG,
  applyParkNavTheme,
}
