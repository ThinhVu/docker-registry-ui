<script>
import dialogApi from './dialog'
import msgBoxApi from './msg-box'
import notificationApi from './notification'
import Icon from '../Icon'
import Overlay from '../Overlay'

export default {
  components: {Icon, Overlay},
  setup() {
    return () => <>
      {dialogApi.render()}
      {msgBoxApi.render()}
      {notificationApi.render()}
    </>
  }
}
</script>
