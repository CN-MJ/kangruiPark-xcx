// 后端 API 配置
// 开发者工具可用 127.0.0.1；真机调试请改为本机局域网 IP
// 远程生产环境
// const API_BASE_URL = 'https://api.gannanhealthcity.cn/api'
// 远程测试环境
// const API_BASE_URL = 'https://test.gannanhealthcity.cn/api' 
// 本地测试环境
const API_BASE_URL = 'http://127.0.0.1:3922/api'
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

module.exports = {
  API_BASE_URL,
  SERVER_BASE_URL,
}
