import Vue from 'vue'
import App from './App.vue'
import vibrant from 'vibrant'
Vue.config.productionTip = false

new Vue({
  vibrant,
  render: h => h(App),
}).$mount('#app')
