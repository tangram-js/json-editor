<template>
  <span>
    <span>: </span>
    <input v-if="node.editingValue" type="text" v-model="value" @click="valueClicked" @change="changeValue" @drop="disableDrop">
    <span class="value" v-else="node.editingValue" v-show="visible" @click="valueClicked">{{node.value}}</span>
  </span>
</template>
<script>
  import editorMixin from './editor-mixin'

  export default {
    mixins: [editorMixin]
  }
</script>
<style scoped>
  .value {
    minWidth: 10px;
  }
</style>
