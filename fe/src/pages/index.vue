<script>
import _ from 'lodash'
import {computed, onMounted, ref} from 'vue';
import TimeDisplay from '@/components/UiLib/TimeDisplay';
import Icon from '@/components/UiLib/Icon';
import {addRegistry, deleteManifest, getCatalog, getManifest, getRegistries, getTags} from '@/api';
import dialog from '@/components/UiLib/Api/dialog';
import notification from '@/components/UiLib/Api/notification';
import msgBox from '@/components/UiLib/Api/msg-box';
import MSwitch from '@/components/UiLib/Switch';
import Spacer from '@/components/UiLib/Spacer';
const toMb = v => `${_.round(v / 1048576, 0)}MB`
export default {
  name: 'index',
  components: {TimeDisplay, Icon, Spacer},
  setup() {
    const registries = ref([])
    const selectedRegistryIndex = ref(0)
    const selectedRegistry = computed(() => !_.isEmpty(registries.value) && registries.value[selectedRegistryIndex.value])
    const repositories = ref([])
    const selectedRepository = ref()
    const tags = ref([])
    const selectedTag = ref()
    const manifest = ref()
    const size = computed(() => manifest.value && toMb(_.sumBy(manifest.value.layers, layer => layer.size)))
    const loading = ref({})
    const exploreRegistry = async (registryIndex) => {
      loading.value[`registry_${registryIndex}`] = true
      try {
        selectedRegistryIndex.value = registryIndex
        const data = await getCatalog(registryIndex)
        repositories.value = data.repositories
        if (_.isEmpty(data.repositories))
          notification.info('Empty')
      } catch (e) {
        console.error(e)
        repositories.value = []
        notification.err(e.message)
      }
      delete loading.value[`registry_${registryIndex}`]
    }
    const exploreRepository = async (repository) => {
      selectedRepository.value = repository
      loading.value[`repo_${repository}`] = true
      try {
        tags.value = []
        const data = await getTags(selectedRegistryIndex.value, repository)
        tags.value = (data.tags || []).sort()
        if (_.isEmpty(tags.value))
          notification.info('Empty')
      } catch (e) {
        console.error(e)
        tags.value = []
        notification.err(e.message)
      }
      delete loading.value[`repo_${repository}`]
    }
    const exploreTag = async (tag) => {
      selectedTag.value = tag
      loading.value[`tag_${tag}`] = true
      try {
        manifest.value = []
        manifest.value = await getManifest(selectedRegistryIndex.value, selectedRepository.value, tag)
        console.log(manifest.value)
      } catch (e) {
        console.error(e)
      }
      delete loading.value[`tag_${tag}`]
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
          loading.value[`delete-tag_${tag}`] = true
          const manifest = await getManifest(selectedRegistryIndex.value, selectedRepository.value, tag)
          let contentDigest;
          if (manifest.contentDigest) {
            contentDigest = manifest.contentDigest
          } else {
            notification.err('content digest is missing')
            return
            // const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(manifest)));
            // contentDigest = 'sha256:' + Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
          }
          console.log('contentDigest', contentDigest)
          await deleteManifest(selectedRegistryIndex.value, selectedRepository.value, contentDigest)
          notification.success('Manifest has been deleted')
          tags.value = tags.value.filter(item => item !== tag)
        } catch (e) {
          notification.err(e.response.data)
        } finally {
          delete loading.value[`delete-tag_${tag}`]
        }
      }
    }

    const newRegistry = async () => {
      await dialog.show({
        component: {
          components: {MSwitch},
          setup(_, {emit}) {
            const alias = ref(), url = ref(), u = ref(), p = ref(), bypassCORS = ref();
            const cancel = () => emit('close')
            const save = () => {
              if (!alias.value || !url.value || !u.value || !p.value)
                return
              addRegistry({
                alias: alias.value,
                registryUrl: url.value,
                username: u.value,
                password: p.value,
                bypassCORS: bypassCORS.value
              })
              emit('close')
            }

            return () => <div class="bc-gray-0 mx-a px-2 py-2" style="border-radius: 6px">
              <div class="fc fg-1">
                <div class="fr ai-c jc-fs"><span style="width: 110px">Alias: </span><input class="ml-1" v-model={alias.value}/> </div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Registry Url: </span><input class="ml-1"  v-model={url.value}/></div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Username:</span><input class="ml-1"  v-model={u.value}/></div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Password: </span><input class="ml-1"  v-model={p.value}/></div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Bypass CORS: </span><m-switch v-model={bypassCORS.value}/></div>
                <div class="fr jc-fe fg-1">
                  <button onClick={cancel}>Cancel</button>
                  <button onClick={save}>Save</button>
                </div>
              </div>
            </div>
          }
        }
      })
    }
    onMounted(async () => registries.value = await getRegistries())

    return () => <div class="fr h-100vh v-100vw" style="background-color: #121212; color: #fff">
      <div class="ovf-h fr">
        <div class="fc ovf-y-s hide-scroll-bar" style="border-right: thin solid hsla(0,0%,100%,.12);">
          {registries.value.map((item, i) => <div class="px-2 py-2 clickable"
                                                  style={{borderBottom: 'thin solid hsla(0,0%,100%,.12)' }}
                                                  onClick={() => exploreRegistry(i)}>
            {item.alias} { loading.value[`registry_${i}`] ? '...' : '' }
          </div>)}
          <div class="px-2 py-2 clickable jc-c" style={{
            borderBottom: 'thin solid hsla(0,0%,100%,.12)'
          }} onClick={newRegistry}>Add Registry</div>
        </div>

        { selectedRegistry.value ? <div class="fc ovf-y-s hide-scroll-bar" style="border-right: thin solid hsla(0,0%,100%,.12);">
          {repositories.value.map(repository => <div class="px-2 py-2 clickable"
                                                     style={{borderBottom: 'thin solid hsla(0,0%,100%,.12)'}}
                                                     onClick={() => exploreRepository(repository)}>
            {repository} { loading.value[`repo_${repository}`] ? '...' : '' }
          </div>)}
        </div> : null }

        { selectedRepository.value ? <div class="ovf-y-s hide-scroll-bar" style="border-right: thin solid hsla(0,0%,100%,.12);">
          {tags.value.map(tag => <div class="fr ai-c fg-2 px-2 py-2 clickable"
                                      style={{borderBottom: 'thin solid hsla(0,0%,100%,.12)'}}>
            <span onClick={() => exploreTag(tag)}>
              {loading.value[`delete-tag_${tag}`] ? 'Removing ' : ''}
              {tag}
              {loading.value[`tag_${tag}`] ? '...' : '' }
            </span>
            <spacer/>
            <icon onClick={() => copy(tag)}>fas fa-copy@16:#fff</icon>
            <icon onClick={() => remove(tag)}>fas fa-times@16:#fff</icon>
          </div>)}
        </div> : null }

        { selectedTag.value ? <div class="ovf-y-s hide-scroll-bar">
          <p>Size: {size.value}</p>
        </div> : null }
      </div>
    </div>
  }
}
</script>
