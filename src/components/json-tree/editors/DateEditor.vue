<template xmlns:v-on="">
  <span @click="valueClicked">
    <span>: </span>
    <!--input v-if="node.editingValue" type="text" v-model="value" @click="valueClicked" @change="changeValue" @drop="disableDrop"-->
    <date-picker
      v-if="node.editingValue"
      :inline="true"
      v-model="value"
      format="yyyy-MM-dd"
      v-on:input="changeValue"
      @drop="disableDrop"
    ></date-picker>
    <span class="value" v-else="node.editingValue" v-show="visible">{{node.value}}</span>
  </span>
</template>
<script>
  import editorMixin from './editor-mixin'
  import DatePicker from 'vuejs-datepicker'

  export default {
    mixins: [editorMixin],
    methods: {
      validate () {
        if (Object.prototype.toString.call(this.value) === '[object Date]') {
          this.value = this.value.toISOString()
        }
        return true
      }
    },
    components: {
      DatePicker
    }
  }
</script>
<style scoped>
  .value {
    minWidth: 10px;
  }
</style>
