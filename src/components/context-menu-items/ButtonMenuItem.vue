<template>
  <a :class="{ 'disabled': disabled}" @click="select">
    <img v-if="menu.icon" class="context-menu__icon" :src="menu.icon">
    <span v-show="menu.label">{{menu.label}}</span>
  </a>
</template>
<script>
  export default {
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
    computed: {
      disabled () {
        if (typeof this.menu.disabled === 'function') return this.menu.disabled(this.context.source)
        return this.menu.disabled
      }
    },
    methods: {
      select () {
        if (!this.disabled) {
          if (typeof this.menu.action === 'function') {
            this.menu.action(this.context.source)
          }
          this.context.menuSelected({ source: this.context.source, menu: this.menu })
          this.context.hide()
        }
      }
    }
  }
</script>
<style scoped>
  a > span {
    color: #333333;
  }
  a.disabled > span {
    color: #999999;
  }
  .context-menu__menu .disabled > a.disabled:hover, .context-menu__root .disabled > a.disabled:hover {
    text-decoration: none;
    cursor: default;
    background-color: transparent;
  }
</style>
