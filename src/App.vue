<template>
  <div id="app">
    <json-editor ref="editor"></json-editor>
  </div>
</template>

<script>
  import JsonEditor from './components/JsonEditor.vue'

  function getURLParameter (param) {
    if (!window.location.href) {
      return
    }
    var m = new RegExp(param + '=([^&]*)').exec(window.location.href.substring(1))
    if (!m) {
      return
    }
    return decodeURIComponent(m[1])
  }

  export default {
    name: 'app',
    created () {
      this.schema = getURLParameter('schema')
      // setup after 1 sec
      window.setTimeout(this.setup, 1000)
    },
    data () {
      return {
        repository: null,
        schema: null
      }
    },
    methods: {
      async setup () {
        this.signIn = false
        // init tree data
        this.$refs.editor.setup(null, this.schema || 'json_schema')
      }
    },
    components: {
      JsonEditor
    }
  }
</script>

<style scoped>
</style>
