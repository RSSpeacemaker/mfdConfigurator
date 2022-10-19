// vite.config.js
import basicSsl from '@vitejs/plugin-basic-ssl'

export default {
  base:'/mfdConfigurator/',
  plugins: [
    basicSsl()
  ],
  build:{
    target:'esnext'
  }
}