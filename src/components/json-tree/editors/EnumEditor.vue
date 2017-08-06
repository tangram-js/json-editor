<template>
  <span>
    <span>: </span>
    <select v-if="node.editingValue" v-model="value" @click="valueClicked" @change="changeValue" @drop="disableDrop">
      <option v-for="item in itemList" :value="item.value">{{item.label}}</option>
    </select>
    <span class="value" v-else="node.editingValue" v-show="visible" @click="valueClicked">{{node.value}}</span>
  </span>
</template>
<script>
  import editorMixin from './editor-mixin'

  export default {
    mixins: [editorMixin],
    computed: {
      itemList () {
        let list = []
        this.node.schema.enum.forEach(item => {
          list.push({value: item, label: JSON.stringify(item)})
        })
        return list
      }
    }
  }
</script>
<style scoped>
  .value {
    minWidth: 10px;
  }
</style>
