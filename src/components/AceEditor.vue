<template>
  <div :style="editorStyle"></div>
</template>
<script>
  import ace from 'brace'

  export default {
    props: {
      content: {
        type: String,
        required: true
      },
      lang: {
        type: String
      },
      theme: {
        type: String
      },
      width: {
        type: String
      },
      height: {
        type: String
      }
    },
    data () {
      return {
        editor: null,
        currentContent: ''
      }
    },
    watch: {
      'content' (value) {
        if (this.currentContent !== value) {
          this.editor.setValue(value, 1)
        }
      }
    },
    computed: {
      editorStyle () {
        let w = this.width || '100%'
        let h = this.height || '100%'
        return `width: ${w}; height: ${h};`
      }
    },
    mounted () {
      const lang = this.lang || 'json'
      const theme = this.theme || 'github'
      require(`brace/mode/${lang}`)
      require(`brace/theme/${theme}`)

      this.editor = ace.edit(this.$el)
      this.editor.$blockScrolling = Infinity
      this.editor.setValue(this.content, 1)
      this.editor.getSession().setMode(`ace/mode/${lang}`)
      this.editor.setTheme(`ace/theme/${theme}`)
      this.editor.setOptions({
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false
      })
      this.editor.on('change', () => {
        this.currentContent = this.editor.getValue()
        this.$emit('change-content', this.currentContent)
      })
    },
    methods: {
      disable () {
        this.editor.setOptions({
          readOnly: true,
          highlightActiveLine: false,
          highlightGutterLine: false
        })
      },
      enable () {
        this.editor.setOptions({
          readOnly: false,
          highlightActiveLine: true,
          highlightGutterLine: true
        })
      },
      copyToClipboard () {
        let sel = this.editor.selection.toJSON()
        this.editor.selectAll()
        this.editor.focus()
        window.document.execCommand('copy')
        this.editor.selection.fromJSON(sel)
      }
    }
  }
</script>
<style>
</style>
