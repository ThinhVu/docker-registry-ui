<script>
import _ from 'lodash'
import {computed, onMounted, ref} from 'vue';
import TimeDisplay from '@/components/UiLib/TimeDisplay';
import Icon from '@/components/UiLib/Icon';
import {deleteManifest, getAccessToken, getCatalog, getManifest, getRegistries, getTags, setAccessToken} from '@/api';
import dialog from '@/components/UiLib/Api/dialog';
import notification from '@/components/UiLib/Api/notification';
import msgBox from '@/components/UiLib/Api/msg-box';

const toMb = v => `${_.round(v / 1048576, 0)}MB`

export default {
  name: 'index',
  components: {TimeDisplay, Icon},
  setup() {
    const registries = ref([])
    const selectedRegistryIndex = ref(0)
    const selectedRegistry = computed(() => registries.value && registries.value.length && registries.value[selectedRegistryIndex.value])
    const repositories = ref([])
    const selectedRepository = ref()
    const tags = ref([])
    const selectedTag = ref()
    const manifest = ref()
    const size = computed(() => manifest.value && toMb(_.sumBy(manifest.value.layers, layer => layer.size)))
    const exploreRegistry = async (registryIndex) => {
      try {
        selectedRegistryIndex.value = registryIndex
        const data = await getCatalog(registryIndex)
        repositories.value = data.repositories
      } catch (e) {
        console.error(e)
        repositories.value = []
      }
    }
    const exploreRepository = async (repository) => {
      selectedRepository.value = repository
      try {
        const data = await getTags(selectedRegistryIndex.value, repository)
        console.log('exploreRepository', data)
        tags.value = data.tags || []
      } catch (e) {
        console.error(e)
        tags.value = []
      }
    }
    const exploreTag = async (tag) => {
      selectedTag.value = tag
      manifest.value = await getManifest(selectedRegistryIndex.value, selectedRepository.value, tag)
    }
    const copy = async (tag) => {
      const registry = selectedRegistry.value.registryUrl.split('://')[1];
      const repository = selectedRepository.value
      await navigator.clipboard.writeText(`docker pull ${registry}/${repository}:${tag}`)
      notification.success('Copied')
    }
    const remove = async (tag) => {
      const rs = await msgBox.show('Confirm delete', 'Delete this image?', msgBox.Buttons.YesNo, msgBox.Icons.Question)
      if (rs === msgBox.Results.yes) {
        try {
          const manifest = await getManifest(selectedRegistryIndex.value, selectedRepository.value, tag)
          const digest = manifest.config.digest
          await deleteManifest(selectedRegistryIndex.value, selectedRepository.value, digest)
        } catch (e) {
          notification.err(e.response.data)
        }
      }
    }

    const askForAccessToken = async () => {
      await dialog.show({
        component: {
          setup(_, {emit}) {
            const accessToken = ref()
            const save = () => {
              console.log('accessToken.value', accessToken.value)
              if (accessToken.value) {
                setAccessToken(accessToken.value)
                emit('close')
              }
            }
            return () => <div class="bc-gray-0 mx-a px-2 py-2" style="border-radius: 6px">
              <div class="mb-2">Enter access token:</div>
              <div class="fr ai-c fg-1">
                <input v-model={accessToken.value}/>
                <button onClick={save}>Save</button>
              </div>
            </div>
          }
        }
      })
    }


    onMounted(async () => {
      const at = getAccessToken()
      console.log('at', at)

      if (!at) {
        await askForAccessToken()
      } else {
        registries.value = await getRegistries()
      }
    })

    return () => <div class="fr h-100vh v-100vw" style="background-color: #121212">
      <div class="ovf-h fr">
        <div
            class="fc ovf-y-s hide-scroll-bar"
            style="width: 280px; min-width: 280px; background-color: #363636; color: #fff; border-right: thin solid hsla(0,0%,100%,.12);">
          {registries.value.map((item, i) => <div class="fr ai-c px-2 py-2 clickable" style={{
            cursor: 'pointer',
            margin: '4px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            borderBottom: 'thin solid hsla(0,0%,100%,.12)'
          }} onClick={() => exploreRegistry(i)}>
            {item.registryUrl}
          </div>)}
        </div>
        <div class="ovf-h fr"
             style="width: calc(100% - 280px); background-color: #363636; color: #fff;">
          <div class="f1" style="border-right: thin solid hsla(0,0%,100%,.12);">
            {repositories.value.map(repository => <div style={{borderBottom: 'thin solid hsla(0,0%,100%,.12)'}}
                                                       class="px-2 py-2 clickable"
                                                       onClick={() => exploreRepository(repository)}>
              {repository}
            </div>)}
          </div>
          <div class="f1">
            {tags.value.map(tag => <div
                style={{borderBottom: 'thin solid hsla(0,0%,100%,.12)'}}
                class="fr ai-c fg-2 px-2 py-2 clickable">
              <span onClick={() => exploreTag(tag)}>{tag}</span>
              <spacer/>
              <icon onClick={() => copy(tag)}>fas fa-copy:#fff</icon>
              <icon onClick={() => remove(tag)}>fas fa-times:#fff</icon>
            </div>)}
          </div>
          { selectedTag.value ? <div class="f1">
            <p>Size: {size.value}</p>
          </div> : null }
        </div>
      </div>
    </div>
  }
}
</script>
