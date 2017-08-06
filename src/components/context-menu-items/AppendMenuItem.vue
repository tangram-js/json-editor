<template>
  <a>
    <img v-if="menu.icon" class="context-menu__icon" :src="menu.icon">
    <span v-show="menu.label">{{menu.label}}</span>
    <select v-model="appendNode" @change="nodeSelected">
      <option v-for="item in items" :value="item.value">{{item.label}}</option>
    </select>
    <div v-if="inputName">
      <span v-show="menu.label">Property Name:</span>
      <select ref="nameSelect" v-if="propertyNameList" v-model="propertyName" @change="nameChanged">
        <option v-for="item in propertyNameList" :value="item">{{item}}</option>
      </select>
      <input ref="nameInput" v-else="propertyNameList" type="text" v-model="propertyName" @change="nameChanged">
    </div>
  </a>
</template>
<script>
  export default {
    created () {
      this.context.$on('retrieve-value', this.retrieveValue)
    },
    props: {
      menu: {
        type: Object,
        required: true
      },
      context: {
        type: Object,
        required: true
      }
    },
    data () {
      return {
        appendNode: null,
        inputName: false,
        propertyName: '',
        propertyNameList: null
      }
    },
    computed: {
      disabled () {
        if (typeof this.menu.disabled === 'function') return this.menu.disabled(this.context.source)
        return this.menu.disabled
      },
      items () {
        if (typeof this.menu.selectItems === 'function') {
          return this.menu.selectItems(this.context.source)
        }
        if (Array.isArray(this.menu.selectItems)) {
          return this.menu.selectItems
        }
        return [{ value: null, label: '' }]
      }
    },
    methods: {
      retrieveValue () {
        this.inputName = false
        this.appendNode = null
      },
      nodeSelected () {
        if (!this.disabled) {
          if (this.appendNode === null) {
            this.context.hide()
            return
          }
          if (this.context.source.node.schema.type === 'array' || this.appendNode.name) {
            this.context.source.append(this.appendNode)
            this.context.hide()
          } else {
            this.propertyNameList = this.appendNode.nameList
            this.inputName = true
            this.$nextTick(() => {
              if (this.propertyNameList) {
                this.$refs.nameSelect.focus()
              } else {
                this.$refs.nameInput.focus()
              }
            })
          }
        }
      },
      nameChanged () {
        if (!this.disabled) {
          this.appendNode.name = this.propertyName
          this.context.source.append(this.appendNode)
          this.context.hide()
        }
      }
    }
  }
</script>
<style scoped>
  span {
    color: #333333;
  }
</style>
