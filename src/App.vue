<template>
  <div id="app">
    <Main msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
import Main from './components/Main.vue'

export default {
  name: 'app',
  components: {
    Main
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Barlow&display=swap');
*{
  font-family: 'Barlow', Helvetica, sans-serif;
  padding: 0;
  margin: 0;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3450;
}
li{
  list-style-type: none;
}
ul{
  margin:0;
  padding:0;
  display: inline-block;
  float:left;
  width:50%;
}
</style>
