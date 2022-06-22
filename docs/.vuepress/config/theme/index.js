const themeReco = require('./themeReco.js')
const nav = require('../nav/')
const sidebar = require('../sidebar/')

module.exports = Object.assign({}, themeReco, {
  nav,
  sidebar,
  // logo: '/head.png',
  // 搜索设置
  authorAvatar: '/head.png',
  search: true,
  searchMaxSuggestions: 10,
  // 自动形成侧边导航
  sidebar: 'auto',
  // 添加评论
  valineConfig: {
    appId: 'vQ1OnCVXDe7rpBfTzs86utGq-gzGzoHsz',
    appKey: 'z4ScBiUUrNIqcnFhSr5HnY4B'
  }
})