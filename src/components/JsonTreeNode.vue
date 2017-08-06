<template>
  <li class="tree__item" :id="node.id? node.id : null">
    <span
      v-if="node.children && node.expendable !== false"
      class="tree__toggle-btn"
      @click="toggle"
      v-html="toggleButton"
    ></span>
    <span v-else="node.children" class="tree__toggle-btn-indent">&nbsp;</span>
    <span
      class="tree__node"
      :class="{ 'tree__node__selected': node.selected }"
      :title="nodeType"
      :draggable="(node.draggable && !node.editing) ? 'true' : 'false'"
      @click="select"
      @dblclick="startEditValue"
      @contextmenu="contextMenu"
      @dragstart="dragStart"
      @dragover="dragOver"
      @drop="drop"
    >
      <img v-if="icon" class="tree__node-icon" :src="icon" :draggable="(node.draggable && !node.editingName && !node.editingValue) ? 'true' : 'false'">
      <input v-if="node.editingName" type="text" v-model="name" @click="nameClicked" @change="changeName" @drop="disableDrop">
      <span v-else="node.editingName" v-show="node.name" @click="nameClicked">{{node.name}}</span>
      <component ref="editor" v-if="showValue" :is="editor" :node="node" :options="options"></component>
    </span>
    <transition name="fade">
      <ul class="tree__sub-tree" v-show="node.expended && node.children">
        <json-tree-node
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :options="options"
        >
        </json-tree-node>
      </ul>
    </transition>
  </li>
</template>
<script>
  import Editors from './json-tree/editors'

  export default {
    name: 'JsonTreeNode',
    props: {
      node: {
        type: Object,
        required: true
      },
      options: {
        type: Object,
        required: true
      }
    },
    data () {
      return {
        name: ''
      }
    },
    computed: {
      icon () {
        if (this.options.iconModule) {
          let icon = this.options.iconModule.icon(this.node.icon)
          if (!icon) icon = this.options.iconModule.icon(this.node.type)
          if (!icon) {
            if (this.node.children) {
              icon = this.options.iconModule.icon('folder')
            } else {
              icon = this.options.iconModule.icon('file')
            }
          }
          return icon
        } else return null
      },
      nodeType () {
        if (this.node.schema && this.node.schema.description) return this.node.schema.description
        if (this.node.schema && this.node.schema.title) return this.node.schema.title
        return this.node.type
      },
      toggleButton () {
        if (this.options.toggleButton) {
          return this.options.toggleButton(this.node.expended)
        } else return this.node.expended ? '&#9660;' : '&#9658;'
      },
      showValue () {
        return this.node.type !== 'array' && this.node.type !== 'object'
      },
      editor () {
        let type = this.node.type
        if (type === 'array' || type === 'object') return 'blankEditor'
        let schema = this.node.schema
        if (schema) {
          if (schema.enum) return 'enumEditor'
          if (schema.format) {
            let editorName = `${schema.type}_${schema.format}Editor`
            if (Editors[editorName]) return editorName
          }
        }
        return `${this.node.type}Editor`
      }
    },
    methods: {
      toggle () {
        this.options.tree.toggle(this.node)
      },
      nameClicked (e) {
        if (this.node.selected && this.node.editable && this.node.renamable && this.options.editable) {
          this.name = this.node.name
          this.options.tree.startEditName(this.node)
          e.stopPropagation()
        }
      },
      select () {
        if (this.node.selected) {
          if (this.node.editingName) this.options.tree.stopEditName(this.node)
          if (this.node.editingValue) this.options.tree.stopEditValue(this.node)
          return
        }
        this.options.tree.select(this.node)
      },
      startEditName () {
        if ((!this.options.editable) || (!this.node.editable) || this.node.editingName) return
        this.name = this.node.name
        this.options.tree.startEditName(this.node)
      },
      startEditValue () {
        this.$refs.editor.startEditValue()
      },
      contextMenu (e) {
        this.select()
        this.options.tree.treeContextMenu(e, this)
        e.preventDefault()
        e.stopPropagation()
      },
      dragStart (e) {
        if (this.options.clipboard) {
          this.select()
          // put dragged component into clipboard
          this.options.clipboard.draggedObject = this
          e.dataTransfer.setData('text', this.node.id)
        }
      },
      dragOver (e) {
        if (!this.node.droppable || !this.node.children) return
        if (this.options.clipboard) {
          // check existence of dragged object from clipboard
          let draggedObject = this.options.clipboard.draggedObject
          if (!draggedObject) return
          // check for node drop on it's descendant or parent
          if (this.node === draggedObject.node.parent || this.node.isAncestor(draggedObject.node)) return
          // validate drag over
          if (!this.node.validateChild(draggedObject.node)) return
          e.preventDefault()
        }
      },
      disableDrop (e) {
        e.preventDefault()
        e.stopPropagation()
        return false
      },
      drop (e) {
        e.preventDefault()
        if (this.options.clipboard) {
          let draggedObject = this.options.clipboard.draggedObject
          if (typeof draggedObject.remove === 'function') {
            draggedObject.remove()
          }
          this.append(draggedObject.node)
          draggedObject = null
        }
      },
      changeName () {
        this.options.tree.rename(this.node, this.name)
      },
      rename () {
        if (this.node.editable && this.node.renamable && this.options.editable) {
          this.name = this.node.name
          if (!this.node.editingName) this.options.tree.startEditName(this.node)
        }
      },
      updateValue () {
        if (this.node.editable && this.options.editable) {
          this.$refs.editor.value = this.node.value
          if (!this.node.editingValue) this.options.tree.startEditValue(this.node)
        }
      },
      replace (node) {
        this.options.tree.replace(this.node, node)
      },
      append (child) {
        this.options.tree.append(this.node, child)
      },
      remove () {
        let parent = this.node.parent
        this.options.tree.remove(this.node)
        this.options.tree.select(parent)
      },
      moveUp () {
        this.options.tree.moveUp(this.node)
      },
      moveDown () {
        this.options.tree.moveDown(this.node)
      }
    },
    components: Editors
  }
</script>
<style scoped>
  ul.tree__sub-tree {
    padding-left: 1.5em;
    list-style-type: none;
    list-style-position: inside;
  }
  li.tree__item {
    margin-top: 2px;
    margin-bottom: 2px;
  }
  .tree__node {
    padding: 4px;
    cursor: default;
  }
  .tree__toggle-btn {
    cursor: pointer;
  }
  .tree__toggle-btn-indent {
    width: 1em;
    display: inline-block;
  }
  .tree__node:hover {
    background-color: #cff8ff;
  }
  .tree__node-icon {
    vertical-align: middle;
  }
  .tree__node__selected {
    background-color: lightskyblue;
  }
  .tree__node__selected:hover {
    background-color: lightskyblue;
  }
  .fade-enter-active, .fade-leave-active {
    transition: opacity .5s
  }
  .fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
    opacity: 0
  }
</style>
