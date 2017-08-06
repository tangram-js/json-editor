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
    mixins: [editorMixin],
    methods: {
      convert (value) {
        if (/^([-+])?([0-9]+|Infinity)$/.test(value)) {
          this.value = Number(value)
        } else {
          this.value = NaN
        }
      },
      validate () {
        this.convert(this.value)
        if (isNaN(this.value)) {
          this.options.tree.store.alertMessage = 'Invalid value, require integer.'
          return false
        } else {
          return true
        }
      }
    }
  }
</script>
<style scoped>
  .value {
    minWidth: 10px;
  }
</style>
