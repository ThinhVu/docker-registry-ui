<script>
import _ from 'lodash'
import {computed, onMounted, ref, withModifiers} from 'vue';
import Icon from '@/components/UiLib/Icon';
import {addRegistry, deleteManifest, getCatalog, getManifest, getRegistries, getTags, removeRegistry} from '@/api';
import dialog from '@/components/UiLib/Api/dialog';
import notification from '@/components/UiLib/Api/notification';
import msgBox from '@/components/UiLib/Api/msg-box';
import MSwitch from '@/components/UiLib/Switch';
import Spacer from '@/components/UiLib/Spacer';
import {useVOnboarding, VOnboardingWrapper} from 'v-onboarding';
import 'v-onboarding/dist/style.css';

const toMb = v => `${_.round(v / 1048576, 0)}MB`

export default {
  name: 'index',
  components: {Icon, Spacer, VOnboardingWrapper},
  setup() {
    const busy = ref({})

    // registry
    const addRegistryBtn = ref()
    const registries = ref([])
    const selectedRegistryIndex = ref(-1)
    const selectedRegistry = computed(() => selectedRegistryIndex.value >= 0 && !_.isEmpty(registries.value) && registries.value[selectedRegistryIndex.value])
    const newRegistry = async () => {
      const registryAdded = await dialog.show({
        component: {
          components: {MSwitch},
          setup(_, {emit}) {
            const alias = ref(), url = ref(), u = ref(), p = ref(), bypassCORS = ref();
            const cancel = () => emit('close')
            const save = () => {
              if (!alias.value || !url.value || !u.value || !p.value) {
                return
              }
              addRegistry({
                alias: alias.value,
                registryUrl: url.value,
                username: u.value,
                password: p.value,
                bypassCORS: bypassCORS.value
              })
              emit('close', true)
            }

            return () => <div class="bc-gray-0 mx-a px-2 py-2" style="border-radius: 6px">
              <div class="fc fg-1">
                <div class="fr ai-c jc-fs">
                  <span style="width: 110px">Alias: </span><input id="registry-alias" class="ml-1" v-model={alias.value}/></div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Registry
                  Url: </span><input id="registry-url" class="ml-1" v-model={url.value}/></div>
                <div class="fr ai-c jc-fs">
                  <span style="width: 110px">Username:</span><input id="registry-username" class="ml-1" v-model={u.value}/></div>
                <div class="fr ai-c jc-fs">
                  <span style="width: 110px">Password: </span><input id="registry-password" class="ml-1" v-model={p.value}/></div>
                <div class="fr ai-c jc-fs"><span style="width: 110px">Bypass CORS: </span>
                  <m-switch id="registry-cors" v-model={bypassCORS.value}/>
                </div>
                <div class="fr jc-fe fg-1">
                  <button onClick={cancel}>Cancel</button>
                  <button id="save-registry-btn" onClick={save}>Save</button>
                </div>
              </div>
            </div>
          }
        }
      })
      if (registryAdded)
        loadRegistries()
    }
    const loadRegistries = () => registries.value = getRegistries()
    const confirmRemoveRegistry = async (i) => {
      const response = await msgBox.show(
          'Remove registry',
          'Are you sure you want to delete this registry?',
          msgBox.Buttons.YesNo,
          msgBox.Icons.Question
      )
      if (response === msgBox.Results.yes) {
        removeRegistry(i)
      }
    }
    const exploreRegistry = async (registryIndex) => {
      busy.value[`registry_${registryIndex}`] = true
      try {
        selectedRegistryIndex.value = registryIndex
        const data = await getCatalog(registryIndex)
        repositories.value = data.repositories
        if (_.isEmpty(data.repositories)) {
          notification.info('Empty')
        }
      } catch (e) {
        console.error(e)
        repositories.value = []
        notification.err(e.message)
      }
      delete busy.value[`registry_${registryIndex}`]
    }

    // repo
    const repositories = ref([])
    const selectedRepository = ref()
    const exploreRepository = async (repository) => {
      selectedRepository.value = repository
      busy.value[`repo_${repository}`] = true
      try {
        tags.value = []
        const data = await getTags(selectedRegistryIndex.value, repository)
        tags.value = (data.tags || []).sort()
        if (_.isEmpty(tags.value)) {
          notification.info('Empty')
        }
      } catch (e) {
        console.error(e)
        tags.value = []
        notification.err(e.message)
      }
      delete busy.value[`repo_${repository}`]
    }

    // tag
    const tags = ref([])
    const selectedTag = ref()
    const manifest = ref()
    const size = computed(() => manifest.value && toMb(_.sumBy(manifest.value.layers, layer => layer.size)))
    const exploreTag = async (tag) => {
      selectedTag.value = tag
      busy.value[`tag_${tag}`] = true
      try {
        manifest.value = []
        manifest.value = await getManifest(selectedRegistryIndex.value, selectedRepository.value, tag)
        console.log(manifest.value)
      } catch (e) {
        console.error(e)
      }
      delete busy.value[`tag_${tag}`]
    }
    const copyTag = async (tag) => {
      const registry = selectedRegistry.value.registryUrl.split('://')[1];
      const repository = selectedRepository.value
      await navigator.clipboard.writeText(`docker pull ${registry}/${repository}:${tag}`)
      notification.success('Copied')
    }
    const confirmRemoveTag = async (tag) => {
      const rs = await msgBox.show(
          'Remove tag',
          'Are you sure you want to delete this tag?',
          msgBox.Buttons.YesNo,
          msgBox.Icons.Question
      )

      if (rs === msgBox.Results.yes) {
        try {
          busy.value[`delete-tag_${tag}`] = true
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
          await deleteManifest(selectedRegistryIndex.value, selectedRepository.value, contentDigest)
          notification.success('Manifest has been deleted')
          tags.value = tags.value.filter(item => item !== tag)
        } catch (e) {
          notification.err(e.response.data)
        } finally {
          delete busy.value[`delete-tag_${tag}`]
        }
      }
    }

    // onboarding
    const steps = [
      {
        attachTo: { element: '#add-registry' },
        content: { title: "Hello there!", description: "Look like your registry list is empty. Let's add one!" },
        on: {
          afterStep: () => addRegistryBtn.value.click()
        }
      },
      { attachTo: { element: '#registry-alias' }, content: { title: "Set alias", description: "A friendly name of your register" } },
      { attachTo: { element: '#registry-url' }, content: { title: "Set url", description: "Where your Docker registry located. E.g: https://docker.your-server.com" } },
      { attachTo: { element: '#registry-username' }, content: { title: "Set username", description: "Set registry username. Keep in mind that we don't collect this information, it'll be stored in your localStorage." } },
      { attachTo: { element: '#registry-password' }, content: { title: "Set password", description: "Set registry password. Keep in mind that we don't collect this information, it'll be stored in your localStorage." } },
      { attachTo: { element: '#registry-cors' }, content: { title: "Bypass CORS", description: "Some private registry doesn't allow CORS due to incorrect configuration, turn on this flag resolve the issue." } },
      { attachTo: { element: '#save-registry-btn' }, content: { title: "Finish", description: "Now, click this button to finish your first registry" } },
    ]
    const wrapper = ref(null)
    const { start } = useVOnboarding(wrapper)

    onMounted(() => {
      loadRegistries()
      if (!registries.value.length)
        start()
    })

    const styles = {
      app: {backgroundColor: '#121212', color: '#fff'},
      list: {borderRight: 'thin solid hsla(0,0%,100%,.12)'},
      listItem: {borderBottom: 'thin solid hsla(0,0%,100%,.12)'}
    }
    const classes = {
      list: 'ovf-y-s hide-scroll-bar',
      listItem: 'fr ai-c fg-2 px-2 py-2 clickable'
    }

    return () => <div class="fr h-100vh v-100vw ovf-h" style={styles.app}>
      <v-onboarding-wrapper ref={wrapper} steps={steps} style="color: #000"/>
      <section data-name="registries" class={classes.list} style={styles.list}>
        <div id="add-registry" ref={addRegistryBtn} class={classes.listItem} style={styles.listItem} onClick={newRegistry}>Add Registry</div>
        {registries.value.map((item, i) =>
            <div class={classes.listItem} style={styles.listItem} onClick={() => exploreRegistry(i)}>
              <span>{item.alias} {busy.value[`registry_${i}`] ? '...' : ''}</span>
              <spacer/>
              <icon onClick={withModifiers(() => confirmRemoveRegistry(i), ['stop', 'prevent'])}>fas fa-times@16:#fff
              </icon>
            </div>)}
      </section>

      {selectedRegistry.value ? <section data-name="repositories" class={classes.list} style={styles.list}>
        {repositories.value.map(repository => <div class={classes.listItem}
                                                   style={styles.listItem}
                                                   onClick={() => exploreRepository(repository)}>
          {repository} {busy.value[`repo_${repository}`] ? '...' : ''}
        </div>)}
      </section> : null}

      {selectedRepository.value ? <section data-name="tags" class={classes.list} style={styles.list}>
        {tags.value.map(tag => <div class={classes.listItem} style={styles.listItem}>
          <span onClick={() => exploreTag(tag)}>
            {busy.value[`delete-tag_${tag}`] ? 'Removing ' : ''}
            {tag}
            {busy.value[`tag_${tag}`] ? '...' : ''}
          </span>
          <spacer/>
          <icon onClick={() => copyTag(tag)}>fas fa-copy@16:#fff</icon>
          <icon onClick={() => confirmRemoveTag(tag)}>fas fa-times@16:#fff</icon>
        </div>)}
      </section> : null}

      {selectedTag.value ? <section data-name="manifest" class="ovf-y-s hide-scroll-bar px-2 py-2">
        <p>Size: {size.value}</p>
      </section> : null}
    </div>
  }
}
</script>
