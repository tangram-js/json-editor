<template xmlns:v-on="">
  <div class="container" :style="containerStyle">
    <split-panel ref="splitPanel" orientation="vertical" :show-border="true" :init-position="400">
      <div class="tree__container" slot="panel1">
        <json-tree
          ref="tree"
          :options="options"
          v-on:context="contextMenu"
          v-on:rename="updated"
          v-on:update-value="updated"
          v-on:append="updated"
          v-on:remove="updated"
          v-on:move-up="updated"
          v-on:move-down="updated"
          v-on:alert="treeAlert"
        ></json-tree>
      </div>
      <div class="json-content__panel" slot="panel2">
        <div class="json-content__container">
          <div class="json-content__textarea-container">
            <ace-editor
              ref="jsonContent"
              class="json-content__ace"
              :content="jsonContent"
            ></ace-editor>
          </div>
          <div class="json-content__buttons-container">
            <div class="json-content__button-bar">
              <md-button
                class="md-dense json-content__button"
                @click.native="newJson"
              >New</md-button>
              <md-button
                class="md-dense json-content__button"
                @click.native="editJson"
              >{{editLabel}}</md-button>
              <md-button
                class="md-dense json-content__button"
                :disabled="undoDisabled"
                @click.native="undo"
              >Undo</md-button>
              <md-button
                class="md-dense json-content__button"
                :disabled="redoDisabled"
                @click.native="redo"
              >Redo</md-button>
            </div>
            <div class="json-content__button-bar">
              <md-button
                class="md-dense json-content__button"
                @click.native="copyJsonToClipboard"
              >Copy to Clipboard</md-button>
              <md-button
                class="md-dense json-content__button"
                @click.native="downloadJsonToFile"
              >Download to File</md-button>
              <a
                ref="downloadLink"
                :download="downloadFilename"
                :href="downloadLink"
                style="display: none;"
              ></a>
              <md-button
                class="md-dense json-content__button"
                @click.native="loadJsonFromFile"
              >Load from File</md-button>
            </div>
          </div>
        </div>
      </div>
    </split-panel>
    <context-menu ref="context" :menu="menuData" v-on:select="menuSelected"></context-menu>
    <md-dialog-alert
      ref="alert"
      :md-title="alert.title"
      :md-content-html="alert.content"
      :md-ok-text="alert.ok"
    ></md-dialog-alert>
    <md-dialog-confirm
      ref="confirm"
      :md-title="confirm.title"
      :md-content-html="confirm.content"
      :md-ok-text="confirm.ok"
      :md-cancel-text="confirm.cancel"
      @close="confirmClosed"
    ></md-dialog-confirm>
    <md-snackbar
      ref="snackbar"
      :md-duration="snackbar.duration"
      v-on:open="snackbar.visible=true"
      v-on:close="snackbar.visible=false"
    >
      <span>{{snackbar.content}}</span>
      <md-spinner v-if="snackbar.showSpinner" md-indeterminate :md-size="20"></md-spinner>
      <md-button primary @click.native="hideSnackbar">Close</md-button>
    </md-snackbar>
    <md-dialog ref="loadJsonDialog">
      <md-dialog-title>Load JSON document from file</md-dialog-title>
      <md-dialog-content>
        <md-input-container>
          <label>Upload JSON Document File</label>
          <md-file
            v-model="uploadFilename"
            placeholder="Select JSON document files"
            :multiple="multipleUpload"
            @selected="getUploadFiles($event)"
          ></md-file>
        </md-input-container>
      </md-dialog-content>
      <md-dialog-actions>
        <md-button class="md-primary" @click.native="loadJsonFromFileCanceled">Cancel</md-button>
        <md-button class="md-primary" @click.native="loadJsonFromFileConfirmed">Confirm</md-button>
      </md-dialog-actions>
    </md-dialog>
  </div>
</template>
<script>
  import clone from 'clone'
  import SplitPanel from './SplitPanel.vue'
  import JsonTree from './JsonTree.vue'
  import AceEditor from './AceEditor.vue'
  import ContextMenu from './ContextMenu.vue'
  import IconModule from './icon-module'
  import { menuData } from './json-editor'

  function cloneTree (source) {
    let node = {}
    Object.keys(source).forEach(p => {
      if (p !== 'parent' && p !== 'children' && typeof source[p] !== 'undefined') {
        node[p] = clone(source[p])
      }
    })
    if (source.children) {
      node.children = []
      source.children.forEach(child => {
        node.children.push(cloneTree(child))
      })
    }
    return node
  }

  var clipboard = {}

  export default {
    name: 'JsonEditor',
    created () {
      // this.repository = repository
      // this.inspectorOptions.repository = repository
      this.setContainerHeight()
      // register window resize event handler
      window.addEventListener('resize', () => {
        // only process resize event each 0.066 sec (about 15 fts)
        if (!this.timeout) {
          this.timeout = window.setTimeout(() => {
            this.timeout = null
            this.setContainerHeight()
          }, 66)
        }
      })
    },
    mounted () {
      // adjust split panel size
      this.$refs.splitPanel.sizeChanged(this)
    },
    data () {
      return {
        // signIn: true,
        repository: null,
        containerHeight: 400,
        // current schema of JSON document
        jsonSchema: null,
        // all available types
        typeList: [],
        // data for tree
        options: {
          editable: true,
          iconModule: IconModule,
          clipboard: clipboard
        },
        // data for json content
        jsonContent: '',
        editLabel: 'EDIT',
        downloadLink: null,
        downloadFilename: null,
        // data for init menu
        menuData: menuData,
        // data for dialogs
        alert: {
          title: 'title',
          content: 'content',
          ok: 'OK'
        },
        confirm: {
          title: 'title',
          content: 'content',
          ok: 'Confirm',
          cancel: 'Cancel',
          callback: null
        },
        snackbar: {
          content: 'content',
          duration: 90000,
          showSpinner: false,
          visible: false
        },
        // data for undo/redo
        treeDataBackups: [],
        currentVersionNo: 0,
        // data for upload files
        uploadFilename: null,
        multipleUpload: false,
        uploadFiles: null
      }
    },
    computed: {
      containerStyle () {
        return { 'height': `${this.containerHeight}px` }
      },
      undoDisabled () {
        return this.currentVersionNo === 0
      },
      redoDisabled () {
        return this.currentVersionNo === (this.treeDataBackups.length - 1)
      },
      loadAndDeleteDisabled () {
        return !this.signIn || !this.userSchemaSelected
      }
    },
    methods: {
      async setup (repository, schema) {
        this.repository = repository
        this.$refs.tree.setRepository(repository)
        // retrieve types
        try {
          this.typeList = await this.$refs.tree.store.retrieveTypes()
        } catch (err) {
          console.log(`Retrieve types error: ${err.message}`)
          this.showSnackbar(`Retrieve custom schema types error: ${err.message}`, 4000)
        }
        if (this.typeList.indexOf(schema) === -1) {
          this.showSnackbar(`Schema "${schema}" not exist, use "json_schema" instead.`, 4000)
          schema = 'json_schema'
        }
        this.jsonSchema = await this.$refs.tree.store.retrieveSchema(schema)
        this.newJsonConfirmed(true)
      },
      showAlert (title, content) {
        this.alert.title = title
        this.alert.content = content
        this.$refs.alert.open()
      },
      confirmClosed (result) {
        if (typeof this.confirm.callback === 'function') {
          this.confirm.callback(result === 'ok')
        }
      },
      showSnackbar (content, duration, showSpinner) {
        if (this.snackbar.visible) this.$refs.snackbar.close()
        this.snackbar.content = content
        this.snackbar.duration = typeof duration === 'undefined' ? 5000 : duration
        this.snackbar.showSpinner = typeof showSpinner === 'undefined' ? false : showSpinner
        this.$refs.snackbar.open()
      },
      hideSnackbar () {
        this.$refs.snackbar.close()
      },
      treeAlert (message) {
        this.showSnackbar(message, 60000)
      },
      setContainerHeight () {
        this.containerHeight = window.innerHeight - 20
      },
      // method for display context menu
      async contextMenu (e, source) {
        // populate additional menu items
        let dest = source.node
        let addons = [] // additional menu items
        // if editable then add rename menu item
        if (dest.editable && dest.renamable && this.options.editable) {
          addons.push({
            name: 'rename',
            type: 'text-input-menu-item',
            label: 'Rename',
            getValue: source => {
              return source.node.name
            },
            setValue: (source, name) => {
              source.name = name
              source.changeName()
            }
          })
        }
        // add append button
        let validChildren = await this.$refs.tree.store.enumerateValidChildren(dest)
        if (validChildren.length > 0) {
          // retrieve available child
          let selections = []
          // add append menu items
          validChildren.forEach(child => {
            var label = child.type
            if (child.schema) {
              if (child.schema.title) label = child.schema.title
            }
            if (child.name) label = `${label}: ${child.name}`
            selections.push({ value: child, label: label })
          })
          addons.push({
            name: 'append',
            type: 'append-menu-item',
            label: 'Append',
            getValue: source => {
              return ''
            },
            setValue: (source, value) => {
              // append selected node to source
              source.append(cloneTree(value))
            },
            selectItems: selections
          })
        }
        // add divider menu items if addons exist
        if (addons.length > 0) {
          addons.splice(0, 0, { name: 'divider', type: 'divider-menu-item' })
        }
        this.$refs.context.show(e, source, addons)
      },
      undo () {
        if (this.currentVersionNo === 0) return
        this.currentVersionNo--
        let treeData = this.treeDataBackups[this.currentVersionNo]
        this.setTree(treeData)
      },
      redo () {
        if (this.currentVersionNo === this.treeDataBackups.length - 1) return
        this.currentVersionNo++
        let treeData = this.treeDataBackups[this.currentVersionNo]
        this.setTree(treeData)
      },
      // backup tree data for undo/redo
      backupTreeData () {
        let treeData = cloneTree(this.$refs.tree.root)
        this.currentVersionNo++
        if (this.currentVersionNo === this.treeDataBackups.length) {
          this.treeDataBackups.push(treeData)
        } else {
          this.treeDataBackups.splice(this.currentVersionNo, this.treeDataBackups.length - this.currentVersionNo - 1)
          this.treeDataBackups[this.currentVersionNo] = treeData
        }
      },
      async setJsonToTree (json, reset, schema) {
        schema = schema || this.jsonSchema
        await this.$refs.tree.setValue(json, schema)
        this.jsonContent = JSON.stringify(this.$refs.tree.root.value, null, 4)
        if (reset) {
          // reset backup of tree data
          this.treeDataBackups = [cloneTree(this.$refs.tree.root)]
          this.currentVersionNo = 0
        } else {
          this.backupTreeData()
        }
      },
      setTree (treeData) {
        this.$refs.tree.setTree(treeData)
        this.jsonContent = JSON.stringify(this.$refs.tree.root.value, null, 4)
        this.$refs.tree.store.validateWithSchema(this.$refs.tree.root)
      },
      // method for value updated in tree
      updated () {
        this.jsonContent = JSON.stringify(this.$refs.tree.root.value, null, 4)
        this.backupTreeData()
      },
      // method for menu item selected
      menuSelected (payload) {
      },
      // method for new json
      newJson () {
        // if there is unsaved tree data, then confirm to discard it
        if (this.currentVersionNo !== 0) {
          this.confirm.title = 'New JSON'
          this.confirm.content = 'Current JSON document would lost.<br/> Are you sure?'
          this.confirm.callback = this.newJsonConfirmed
          this.$refs.confirm.open()
          return
        }
        this.newJsonConfirmed(true)
      },
      newJsonConfirmed (confirmResult) {
        if (!confirmResult) return
        this.setJsonToTree(null, true)
      },
      editJson () {
        if (this.editLabel === 'EDIT') {
          this.editLabel = 'UPDATE'
          this.$refs.jsonContent.enable()
        } else {
          let value = null
          let msg = ''
          try {
            value = JSON.parse(this.$refs.jsonContent.currentContent)
          } catch (err) {
            msg = err.message
            console.log(`Parse JSON failure: ${msg}`)
            value = null
          }
          if (value === null) {
            this.confirm.title = 'Parse JSON Failure'
            this.confirm.content = `${msg}<br/><br/>Revert to original content?`
            this.confirm.callback = this.editJsonConfirmed
            this.$refs.confirm.open()
            return
          }
          this.editJsonConfirmed(true, value)
        }
      },
      editJsonConfirmed (confirmResult, value) {
        if (typeof value !== 'undefined') {
          this.setJsonToTree(value, false, this.jsonSchema)
        } else {
          if (!confirmResult) return
          let content = this.jsonContent
          this.jsonContent = ''
          this.$nextTick(() => {
            this.jsonContent = content
          })
        }
        this.editLabel = 'EDIT'
        this.$refs.jsonContent.disable()
      },
      importJson () {
        this.uploadFilename = null
        this.multipleUpload = true
        this.uploadFiles = null
        this.$refs.loadJsonDialog.open()
      },
      copyJsonToClipboard () {
        try {
          this.$refs.jsonContent.copyToClipboard()
        } catch (err) {
          this.showSnackbar('Unable copy JSON document to clipboard, please press Ctrl/Cmd+C to copy.', 4000)
        }
      },
      downloadJsonToFile () {
        if (window.document.createEvent) {
          if (this.downloadLink !== null) window.URL.revokeObjectURL(this.downloadLink)
          this.downloadLink = window.URL.createObjectURL(new window.Blob([this.jsonContent], { type: 'application/json' }))
          this.downloadFilename = 'document.json'
          this.$nextTick(() => {
            let link = this.$refs.downloadLink
            link.click()
          })
        }
      },
      loadJsonFromFile () {
        this.uploadFilename = null
        this.multipleUpload = false
        this.uploadFiles = null
        this.$refs.loadJsonDialog.open()
      },
      getUploadFiles (event) {
        this.uploadFiles = event
      },
      loadJsonFromFileCanceled () {
        this.$refs.loadJsonDialog.close()
      },
      loadJsonFromFileConfirmed () {
        if (this.uploadFiles) {
          for (let i = 0; i < this.uploadFiles.length; i++) {
            let file = this.uploadFiles[i]
            if (!file) continue
            let reader = new FileReader()
            reader.onload = async (e) => {
              try {
                let document = JSON.parse(e.target.result)
                this.setJsonToTree(document, true)
              } catch (err) {
                console.log(`load JSON document from file error: ${err.message}`)
                this.showSnackbar(`Load JSON document from file error: ${err.message}`, 4000)
              }
            }
            reader.readAsText(file)
          }
        }
        this.$refs.loadJsonDialog.close()
      },
      jsonContentChanged (content) {
        console.log(`jsonContent changed: ${content}`)
      }
    },
    components: {
      AceEditor,
      SplitPanel,
      JsonTree,
      ContextMenu
    }
  }
</script>
<style scoped>
  .container {
    /*height: 600px;*/
    border: solid 1px black;
    font-size: 12px;
  }

  .tree__container {
    padding: 10px;
    height: 100%;
    overflow: auto;
  }

  .json-content__panel {
    margin: 0;
    padding: 0px;
    height: 100%;
  }

  .json-content__container {
    margin: 0;
    padding: 0px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .json-content__textarea-container {
    margin: 0px;
    padding: 0px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .json-content__textarea {
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    display: block;/*reset from inline*/
    width: 100%;
    margin: 0;/*remove defaults*/
    padding: 4px;
    border: none;
    overflow-y: auto;/*resets IE*/
    overflow-x: hidden;/*resets IE*/
    height: 100%;
    flex-grow: 1;
    resize: none;
    font-size: 12px;
    font-family: Arial;
  }

  .json-content__ace {
    width: 100%;
    height: 100%;
    margin-left: 4px;
    flex-grow: 1;
  }

  .json-content__buttons-container {
    border-top: solid 1px black;
  }

  .json-content__button-bar {
    display: inline-flex;
  }

  .json-content__button {
    font-size: 12px;
    height: 28px;
    min-height: 28px;
    margin: 4px;
  }

  .context-menu {
    font-size: 12px;
  }
</style>
