export default {
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
      value: this.node.value
    }
  },
  computed: {
    visible () {
      return typeof this.node.value !== 'undefined' && this.node.value !== null
    }
  },
  methods: {
    valueClicked (e) {
      this.startEditValue(e)
    },
    startEditValue (e) {
      if (this.node.selected && this.node.editable && this.options.editable) {
        this.value = this.node.value
        this.options.tree.startEditValue(this.node)
        if (e) e.stopPropagation()
      }
    },
    validate () {
      return true
    },
    changeValue () {
      if (this.validate()) this.options.tree.updateValue(this.node, this.value)
    },
    disableDrop (e) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }
}

