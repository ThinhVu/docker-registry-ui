import { createApp } from 'vue';
import {createRouter, createWebHistory} from 'vue-router';
import App from './App.vue';
import Index from './pages/index';

function initApp() {
  const app = createApp(App);

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {path: '/', component: Index},
    ]
  }, {default: '/'})

  app.use(router);

  router.isReady().then(() => app.mount('#app'));
}

initApp();
