<template>
  <router-view #default="{ Component }">
    <component :is="Component"/>
  </router-view>
  <api/>
</template>

<script>
import Api from '@/components/UiLib/Api/Api';
export default {
  name: 'App',
  components: {Api}
}
</script>
<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: Sans-Serif;
}
</style>
