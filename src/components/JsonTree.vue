<template>
  <ul class="tree__root">
    <json-tree-node
      v-if="root"
      ref="root"
      :node="root"
      :options="options"
    ></json-tree-node>
  </ul>
</template>
<script>
  import JsonTreeNode from './JsonTreeNode.vue'
  import JsonTreeStore from './json-tree/store'

  export default {
    created () {
      this.options.tree = this
    },
    props: {
      options: {
        type: Object,
        default: () => {
          return {}
        }
      }
    },
    data () {
      return {
        tree: this,
        store: new JsonTreeStore()
      }
    },
    watch: {
      'store.alertMessage': 'alertMessage'
    },
    computed: {
      root () {
        return this.store.tree
      }
    },
    methods: {
      setRepository (repository) {
        this.store.setRepository(repository)
      },
      async setValue (value, schema, name, renamable) {
        await this.store.setValue(value, schema, name, renamable)
      },
      setTree (tree) {
        this.store.setTree(tree)
        this.$emit('set-tree', tree)
      },
      treeContextMenu (e, source) {
        this.$emit('context', e, source)
      },
      toggle (node) {
        this.store.toggle(node)
      },
      select (node) {
        this.store.select(node)
        this.$emit('select', node)
      },
      startEditName (node) {
        this.store.startEditName(node)
      },
      stopEditName (node) {
        this.store.stopEditName(node)
      },
      rename (node, name) {
        this.store.rename(node, name)
        this.$emit('rename', node, name)
      },
      startEditValue (node) {
        this.store.startEditValue(node)
      },
      stopEditValue (node) {
        this.store.stopEditValue(node)
      },
      updateValue (node, value) {
        this.store.updateValue(node, value)
        this.$emit('update-value', node, value)
      },
      append (node, child) {
        this.$emit('before-append', node, child)
        this.store.append(node, child)
        this.$emit('append', node, child)
      },
      remove (node) {
        this.store.remove(node)
        this.$emit('remove', node)
      },
      moveUp (node) {
        this.store.moveUp(node)
        this.$emit('move-up', node)
      },
      moveDown (node) {
        this.store.moveDown(node)
        this.$emit('move-down', node)
      },
      alertMessage () {
        if (this.store.alertMessage) this.$emit('alert', this.store.alertMessage)
      }
    },
    components: {
      JsonTreeNode
    }
  }
</script>
<style scoped>
  ul.tree__root {
    margin: 0;
    padding: 0;
    padding-left: 1.5em;
    list-style-type: none;
    list-style-position: inside;
  }
</style>
