<script>
import {ref} from 'vue';
import Icon from './Icon';

export default {
  name: 'CollapsableSection',
  components: {Icon},
  props: {title: String, showContent: Boolean},
  setup(props, ctx) {
    const showContent = ref(props.showContent)
    return () => <div>
      <div class="fr ai-c" onClick={() => showContent.value = !showContent.value}>
        <span style="text-transform: uppercase; color: #767676; font-size: 15px; font-weight: 600; margin-right: 6px">{props.title}</span>
        <icon size="15" color="#ddd">{showContent.value ? 'fas fa-caret-down' : 'fas fa-caret-up'}</icon>
      </div>
      { showContent.value ? ctx.slots.default && <div class="mt-2">{ctx.slots.default()}</div> : null }
    </div>
  }
};
</script>
