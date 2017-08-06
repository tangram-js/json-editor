export var menuData = {
  menuItems: [
    {
      name: 'remove',
      label: 'Remove',
      disabled (source) {
        if (source.node.parent) {
          var schema = source.node.parent.schema
          var required = false
          if (schema) {
            if (schema.required) {
              required = schema.required.indexOf(source.node.name) >= 0
            }
          }
          return required
        } else {
          return true
        }
      },
      action (source) {
        source.remove()
      }
    },
    {
      name: 'moveUp',
      label: 'Move Up',
      disabled (source) {
        return !(source.node.parent)
      },
      action: source => {
        source.moveUp()
      }
    },
    {
      name: 'moveDown',
      label: 'Move Down',
      disabled (source) {
        return !(source.node.parent)
      },
      action: source => {
        source.moveDown()
      }
    }
  ]
}

export default menuData
