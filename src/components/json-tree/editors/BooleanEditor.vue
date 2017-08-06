<template>
  <span>
    <span>: </span>
    <select v-if="node.editingValue" v-model="value" @click="valueClicked" @change="changeValue" @drop="disableDrop">
      <option :value="true">True</option>
      <option :value="false">False</option>
    </select>
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
