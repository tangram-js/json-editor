import Vue from 'vue'
import Ajv from 'ajv'
import clone from 'clone'
import $RefParser from 'json-schema-ref-parser'
import jsonDefaults from 'json-schema-empty'
import defaultRepository from './repository'
import schemaFunctions from './schemaFunctions'

var selectedNode
var repository
var jsonSchema

function generateId () {
  return (new Date()).getTime() + ('000000000' + Math.floor((Math.random() * 10000) + 1)).substr(-4)
}

function validateWithSchema (schema, newValue) {
  if (!schema) return null
  let ajv = new Ajv({ allErrors: true })
  try {
    let valid = ajv.validate(schema, newValue)
    if (!valid) {
      let message = ''
      ajv.errors.forEach(err => {
        let path = err.dataPath ? `${err.dataPath}: ` : ''
        message += `${path}${err.message}\r\n`
      })
      return message
    }
  } catch (err) {
    console.log(`validate failure: ${err.message}`)
    return null
  }
}

function resolveDupName (node, parent) {
  var origName = node.name
  var count = 0
  parent.children.forEach(child => {
    let reg = new RegExp(`^${RegExp.escape(origName)}(\\(\\d+\\))?$`, 'g')
    if (reg.test(child.name)) count++
  })
  if (count > 0) {
    node.name = `${origName}(${count})`
  }
}

function populateTree (node, parent) {
  let root = new JsonTreeNode(node.type, node.name, node.value, node.schema, parent,
    node.renamable, node.editable, node.draggable, node.droppable, node.expended, node.selected)
  if (root.selected) selectedNode = root
  if (node.children) {
    root.children = []
    node.children.forEach(child => {
      root.children.push(populateTree(child, root))
    })
  }
  return root
}

function functionName (func) {
  // Match:
  // - ^          the beginning of the string
  // - function   the word 'function'
  // - \s+        at least some white space
  // - ([\w\$]+)  capture one or more valid JavaScript identifier characters
  // - \s*        optionally followed by white space (in theory there won't be any here,
  //              so if performance is an issue this can be omitted[1]
  // - \(         followed by an opening brace
  //
  let result = /^function\s+([\w$]+)\s*\(/.exec(func.toString())

  return result ? result[1] : '' // for an anonymous function there won't be a match
}

function getValueType (value, getConstructorName) {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'object' && getConstructorName) {
    return functionName(value.constructor)
  }
  return typeof value
}

async function retrieveSchemaByName (schemaName) {
  let schema = null
  if (repository) {
    try {
      schema = await repository.retrieveSchema(schemaName)
    } catch (err) {
      console.log(`Retrieve schema (${schemaName}) failure: ${err.message}`)
    }
  }
  if (schema !== null) return schema
  return await defaultRepository.retrieveSchema(schemaName)
}

// generate schema from value
async function retrieveSchemaFromValue (value) {
  let type = getValueType(value, true)
  if (type === 'Object') type = 'object'
  return await retrieveSchemaByName(type)
}

// generate default value from schema
function generateDefault (schema) {
  let d = null
  switch (schema.type) {
    case 'string':
      d = ''
      break
    case 'integer':
    case 'number':
      d = 0
      break
    case 'boolean':
      d = false
      break
    case 'object':
      d = {}
      break
    case 'array':
      d = []
      break
  }
  try {
    d = clone(jsonDefaults(schema))
  } catch (err) {}
  return d
}

class JsonTreeNode {
  constructor (type, name, value, schema, parent, renamable, editable, draggable, droppable, expended, selected) {
    this.id = generateId()
    this.type = type
    this.name = name
    this.schema = schema || retrieveSchemaFromValue(value)
    // consider use default of schema when value is null
    this.value = value
    this.parent = parent
    this.renamable = typeof renamable === 'undefined' ? true : renamable
    this.editable = typeof editable === 'undefined' ? true : editable
    this.draggable = typeof draggable === 'undefined' ? true : draggable
    this.droppable = typeof droppable === 'undefined' ? true : droppable
    this.expended = expended
    this.selected = selected
    this.editingName = false
    this.editingValue = false
  }

  isAncestor (node) {
    if (this === node) return true
    if (this.parent) return this.parent.isAncestor(node)
    else return false
  }

  duplicateChildName (name) {
    let result = false
    this.children.forEach(child => {
      if (child.name === name) result = true
    })
    return result
  }

  rename (newName) {
    this.editingName = false
    if (!newName || newName === '') return 'Invalid name.'
    let parent = this.parent
    if (parent) {
      if (parent.type !== 'object' || parent.duplicateChildName(newName)) return 'Invalid operation.'
    }
    // update name
    if (parent) Vue.delete(parent.value, this.name)
    this.name = newName
    if (parent) Vue.set(parent.value, newName, this.value)
  }

  append (child) {
    if (this.type !== 'object' && this.type !== 'array') return 'Invalid operation.'
    // if child is not JsonTreeNode, then create JsonTreeNode
    let newNode = (child.prototype && functionName(child.prototype) === 'JsonTreeNode') ? child : populateTree(child)
    if (newNode.name) resolveDupName(newNode, this)
    Vue.set(newNode, 'parent', this)
    this.children.push(newNode)
    Vue.set(this, 'expended', true)
    // add item of array or property of object
    if (this.type === 'array') {
      newNode.name = `[${this.children.length - 1}]`
      this.value.push(child.value)
    } else {
      Vue.set(this.value, child.name, child.value)
    }
  }

  renameArrayItems () {
    if (this.type !== 'array') {
      return
    }
    this.children.forEach((item, index) => {
      item.name = `[${index}]`
    })
  }

  remove () {
    let parent = this.parent
    if (parent) {
      let children = parent.children
      let index = children.indexOf(this)
      children.splice(index, 1)
      Vue.set(this, 'parent', null)
      // remove array's element or object's property from parent
      if (parent.type === 'array') {
        parent.value.splice(parent.value.indexOf(this.value), 1)
        parent.renameArrayItems()
      } else {
        Vue.delete(parent.value, this.name)
      }
    }
  }

  updateValue (newValue) {
    this.editingValue = false
    if (typeof newValue === 'undefined') return null
    if (this.type === 'object' || this.type === 'array') return null
    let parent = this.parent
    if (parent) {
      // update value of item of array or property of object
      if (parent.type === 'array') {
        Vue.set(parent.value, parent.value.indexOf(this.value), newValue)
      } else {
        Vue.set(parent.value, this.name, newValue)
      }
    }
    // update value of node
    this.value = newValue
  }

  moveUp () {
    let parent = this.parent
    if (parent) {
      let children = parent.children
      let index = children.indexOf(this)
      if (index <= 0) return
      children.splice(index, 1)
      children.splice(index - 1, 0, this)
      if (parent.type === 'array') parent.renameArrayItems()
    }
  }

  moveDown () {
    let parent = this.parent
    if (parent) {
      let children = parent.children
      let index = children.indexOf(this)
      if (index === -1 || index === children.length - 1) return
      children.splice(index, 1)
      children.splice(index + 1, 0, this)
      if (parent.type === 'array') parent.renameArrayItems()
    }
  }

  matchValidChildren (node) {
    let validChildren = this.enumerateValidChildren()
    for (let child in validChildren) {
      if (child.type !== node.type) continue
      if (JSON.stringify(child.schema) !== JSON.stringify(node.schema)) continue
      if (child.name && child.name !== node.name) continue
      return true
    }
    return false
  }

  validateChild (node) {
    let schema = this.schema
    // check for object
    if (schema.type === 'object') {
      // check for additionalProperties
      let additionalProperties = schema.additionalProperties
      if (typeof additionalProperties === 'undefined' || additionalProperties === true) return true
      // check with valid properties
      return this.matchValidChildren(node)
    }
    // check for array with additionalItems
    if (schema.type === 'array') {
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          // check for additionalItems
          let additionalItems = schema.additionalItems
          if (typeof additionalItems === 'undefined' || additionalItems === true) return true
          // check with valid items
          return this.matchValidChildren(node)
        } else {
          // check with valid items
          return this.matchValidChildren(node)
        }
      } else return true
    }
    return false
  }

  checkPropertyDependency (propertyName) {
    let dependencies = this.schema.dependencies
    if (!dependencies) return true
    let childNameList = []
    this.children.forEach(child => {
      childNameList.push(child.name)
    })
    // find out missing dependent
    let missingDependentList = []
    for (let dependency in dependencies) {
      if (dependency === propertyName) {
        let dependencyItems = dependencies[dependency]
        if (Array.isArray(dependencyItems)) {
          dependencyItems.forEach(item => {
            if (childNameList.indexOf(item) === -1) missingDependentList.push(item)
          })
        }
      }
    }
    // exclude mutual dependency
    for (let dependency in dependencies) {
      let dependencyItems = dependencies[dependency]
      if (Array.isArray(dependencyItems)) {
        if (dependencyItems.indexOf(propertyName) !== -1) {
          let index = missingDependentList.indexOf(dependency)
          if (index !== -1) missingDependentList.splice(index, 1)
        }
      }
    }
    return missingDependentList.length === 0
  }

  async buildValidChild (schema, name) {
    // if before build process exist, then invoke it
    try {
      if (typeof schema['@beforeBuildProc'] === 'function') schema['@beforeBuildProc'](this, schema)
      if (typeof schema['@beforeBuildProc'] === 'object') {
        Object.keys(schema['@beforeBuildProc']).forEach(fn => {
          if (typeof schema['@beforeBuildProc'][fn] === 'function') schema['@beforeBuildProc'][fn](this, schema)
        })
      }
    } catch (err) {
      console.log(`Invoke before build process failure: ${err.message}`)
    }
    let v = generateDefault(schema)
    let validChild = await populateJsonTree(v, schema, name)
    // if after build process exist, then invoke it
    try {
      if (typeof schema['@afterBuildProc'] === 'function') schema['@afterBuildProc'](this, validChild)
      if (typeof schema['@afterBuildProc'] === 'object') {
        Object.keys(schema['@afterBuildProc']).forEach(fn => {
          if (typeof schema['@afterBuildProc'][fn] === 'function') schema['@afterBuildProc'][fn](this, validChild)
        })
      }
    } catch (err) {
      console.log(`Invoke after build process failure: ${err.message}`)
    }
    return validChild
  }

  async enumerateValidChildren () {
    let validChildren = []
    let schema = this.schema
    // enumerate valid children
    let childNameList = []
    if (this.children) {
      this.children.forEach(child => {
        childNameList.push(child.name)
      })
    }
    // if before enumeration process exist, then invoke it
    try {
      if (typeof schema['@beforeEnumProc'] === 'function') schema['@beforeEnumProc'](this)
      if (typeof schema['@beforeEnumProc'] === 'object') {
        Object.keys(schema['@beforeEnumProc']).forEach(fn => {
          if (typeof schema['@beforeEnumProc'][fn] === 'function') schema['@beforeEnumProc'][fn](this)
        })
      }
    } catch (err) {
      console.log(`Invoke before enumeration process failure: ${err.message}`)
    }
    if (schema.type === 'object') {
      let properties = schema.properties
      if (properties) {
        for (let p in properties) {
          if (((schema['@visibleProperties'] && schema['@visibleProperties'].indexOf(p) !== -1) || !schema['@visibleProperties']) &&
            childNameList.indexOf(p) === -1 && this.checkPropertyDependency(p)) {
            let propertySchema = properties[p]
            if (propertySchema.anyOf) {
              for (let i = 0; i < propertySchema.anyOf.length; i++) {
                let s = propertySchema.anyOf[i]
                let n = await this.buildValidChild(s, p)
                n.renamable = false
                validChildren.push(n)
              }
            }
            if (propertySchema.oneOf) {
              for (let i = 0; i < propertySchema.oneOf.length; i++) {
                let s = propertySchema.oneOf[i]
                let n = await this.buildValidChild(s, p)
                n.renamable = false
                validChildren.push(n)
              }
            }
            if (propertySchema.allOf) {
              let combinedSchema = {}
              Object.assign(combinedSchema, ...propertySchema.allOf)
              let n = await this.buildValidChild(combinedSchema, p)
              n.renamable = false
              validChildren.push(n)
            }
            if (propertySchema.type || propertySchema.enum) {
              let n = await this.buildValidChild(propertySchema, p)
              n.renamable = false
              validChildren.push(n)
            }
          }
        }
      }
      let additionalProperties = schema.additionalProperties
      if (typeof additionalProperties === 'object') {
        if (additionalProperties.anyOf) {
          for (let i = 0; i < additionalProperties.anyOf.length; i++) {
            let s = additionalProperties.anyOf[i]
            let n = await this.buildValidChild(s)
            n.renamable = true
            validChildren.push(n)
          }
        }
        if (additionalProperties.oneOf) {
          for (let i = 0; i < additionalProperties.oneOf.length; i++) {
            let s = additionalProperties.oneOf[i]
            let n = await this.buildValidChild(s)
            n.renamable = true
            validChildren.push(n)
          }
        }
        if (additionalProperties.allOf) {
          let combinedSchema = {}
          Object.assign(combinedSchema, ...additionalProperties.allOf)
          let n = await this.buildValidChild(combinedSchema)
          n.renamable = false
          validChildren.push(n)
        }
        if (additionalProperties.type || additionalProperties.enum) {
          let n = await this.buildValidChild(additionalProperties)
          n.renamable = true
          validChildren.push(n)
        }
      }
    }
    if (schema.type === 'array') {
      let items = schema.items
      if (items) {
        if (Array.isArray(items)) {
          let index = childNameList.length
          if (index < items.length) {
            if (items[index].anyOf) {
              for (let i = 0; i < items[index].anyOf.length; i++) {
                let s = items[index].anyOf[i]
                let n = await this.buildValidChild(s)
                n.renamable = false
                validChildren.push(n)
              }
            }
            if (items[index].oneOf) {
              for (let i = 0; i < items[index].oneOf.length; i++) {
                let s = items[index].oneOf[i]
                let n = await this.buildValidChild(s)
                n.renamable = false
                validChildren.push(n)
              }
            }
            if (items[index].allOf) {
              let combinedSchema = {}
              Object.assign(combinedSchema, ...items[index].allOf)
              let n = await this.buildValidChild(combinedSchema)
              n.renamable = false
              validChildren.push(n)
            }
            if (items[index].type || items[index].enum) {
              let n = await this.buildValidChild(items[index])
              n.renamable = false
              validChildren.push(n)
            }
          }
        } else {
          if (items.anyOf) {
            for (let i = 0; i < items.anyOf.length; i++) {
              let s = items.anyOf[i]
              let n = await this.buildValidChild(s)
              n.renamable = false
              validChildren.push(n)
            }
          }
          if (items.oneOf) {
            for (let i = 0; i < items.oneOf.length; i++) {
              let s = items.oneOf[i]
              let n = await this.buildValidChild(s)
              n.renamable = false
              validChildren.push(n)
            }
          }
          if (items.allOf) {
            let combinedSchema = {}
            Object.assign(combinedSchema, ...items.allOf)
            let n = await this.buildValidChild(combinedSchema)
            n.renamable = false
            validChildren.push(n)
          }
          if (items.type || items.enum) {
            let n = await this.buildValidChild(schema.items)
            n.renamable = false
            validChildren.push(n)
          }
        }
      }
    }
    return validChildren
  }
}

// attach functions to schema
function attachFuncsToSchema (schema, nodeList) {
  if (typeof nodeList === 'undefined') {
    nodeList = []
  }
  // check & attach before enumeration process
  if (typeof schema['@beforeEnum'] === 'string' && typeof schemaFunctions[schema['@beforeEnum']] === 'function') {
    schema['@beforeEnumProc'] = schemaFunctions[schema['@beforeEnum']]
  }
  if (typeof schema['@beforeEnum'] === 'object') {
    schema['@beforeEnumProc'] = []
    Object.keys(schema['@beforeEnum']).forEach(fn => {
      if (typeof schemaFunctions[schema['@beforeEnum'][fn]] === 'function') {
        schema['@beforeEnumProc'][fn] = schemaFunctions[schema['@beforeEnum'][fn]]
      }
    })
  }
  // check & attach before build valid child process
  if (typeof schema['@beforeBuild'] === 'string' && typeof schemaFunctions[schema['@beforeBuild']] === 'function') {
    schema['@beforeBuildProc'] = schemaFunctions[schema['@beforeBuild']]
  }
  if (typeof schema['@beforeBuild'] === 'object') {
    schema['@beforeBuildProc'] = []
    Object.keys(schema['@beforeBuild']).forEach(fn => {
      if (typeof schemaFunctions[schema['@beforeBuild'][fn]] === 'function') {
        schema['@beforeBuildProc'][fn] = schemaFunctions[schema['@beforeBuild'][fn]]
      }
    })
  }
  // check & attach after build valid child process
  if (typeof schema['@afterBuild'] === 'string' && typeof schemaFunctions[schema['@afterBuild']] === 'function') {
    schema['@afterBuildProc'] = schemaFunctions[schema['@afterBuild']]
  }
  if (typeof schema['@afterBuild'] === 'object') {
    schema['@afterBuildProc'] = []
    Object.keys(schema['@afterBuild']).forEach(fn => {
      if (typeof schemaFunctions[schema['@afterBuild'][fn]] === 'function') {
        schema['@afterBuildProc'][fn] = schemaFunctions[schema['@afterBuild'][fn]]
      }
    })
  }
  // add schema to node list
  nodeList.push(schema)
  // travers down to schema's properties
  for (var p in schema) {
    // for object only
    var prop = schema[p]
    if (typeof prop === 'object' && !Array.isArray(prop)) {
      // check for node list to prevent circular loop
      if (nodeList.indexOf(prop) === -1) attachFuncsToSchema(prop, nodeList)
    }
  }
}

// return schema of specific child
async function retrieveChildSchema (schema, childName, childValue) {
  if (!childName) return await retrieveSchemaFromValue(childValue)
  if (typeof schema === 'undefined' || schema === null) return await retrieveSchemaFromValue(childValue)
  if (schema.type === 'object') {
    if (schema.properties && schema.properties[childName]) return schema.properties[childName]
    if (typeof schema.additionalProperties === 'object') return schema.additionalProperties
  }
  if (schema.type === 'array') {
    if (schema.items) {
      let itemsType = getValueType(schema.items)
      if (itemsType === 'object') return schema.items
      if (itemsType === 'array') return schema.items[childName]
    }
  }
  return await retrieveSchemaFromValue(childValue)
}

async function populateJsonTree (value, schema, name, renamable, parent) {
  let type = null
  if (schema) {
    type = schema.type ? schema.type : schema.enum ? 'enum' : getValueType(value)
  } else {
    type = getValueType(value)
  }
  if (type === 'undefined' || type === 'null' || type === 'function') return null
  let isSubtree = type === 'array' || type === 'object'
  if (typeof renamable === 'undefined') renamable = true
  let expended = false
  if (parent) {
    if (parent.schema && parent.schema.properties) {
      if (parent.schema.properties[name]) {
        renamable = false
      }
    }
    if (parent.type === 'array') renamable = false
  } else expended = true
  let editable = schema ? !schema.readonly : true
  let jsonTree = new JsonTreeNode(
    type,
    name,
    value,
    schema,
    parent || null,
    renamable,
    editable,
    true,
    true,
    expended,
    false
  )
  if (isSubtree && typeof value === 'object') {
    jsonTree.children = []
    for (let p in value) {
      let propertyType = typeof value[p]
      if (propertyType === 'function' || propertyType === 'undefined') continue
      let name = type === 'array' ? `[${p}]` : p
      let child = await populateJsonTree(value[p], await retrieveChildSchema(schema, p, value[p]), name, true, jsonTree)
      if (child) jsonTree.children.push(child)
    }
  }
  return jsonTree
}

function cloneTree (source, parent) {
  let node = {}
  Object.keys(source).forEach(p => {
    if (p !== 'parent' && p !== 'children' && typeof source[p] !== 'undefined') {
      node[p] = clone(source[p])
    }
  })
  if (parent) node.parent = parent
  if (source.children) {
    node.children = []
    source.children.forEach(child => {
      node.children.push(cloneTree(child, node))
    })
  }
  return node
}

// dereference schema
async function dereferenceSchema (schema) {
  let srcSchema = clone(schema)
  attachFuncsToSchema(srcSchema)
  let resolvers = repository ? repository.resolvers : defaultRepository.resolvers
  return await $RefParser.dereference(srcSchema, { resolve: resolvers })
}

class Store {
  constructor () {
    this.schema = null
    this.repository = null
    this.tree = null
    this.selectedNode = null
    this.alertMessage = null
    this.defaultChildren = []
  }

  setRepository (r) {
    this.repository = r
    repository = r
    if (r) {
      // merge resolvers of repository
      Object.assign(repository.resolvers, defaultRepository.resolvers)
    }
    this.populateDefaultChildren()
  }

  setSchemaFunctions (funcs) {
    Object.assign(schemaFunctions, funcs)
  }

  async setValue (value, schema, name, renamable) {
    this.schema = schema
    jsonSchema = await dereferenceSchema(schema)
    if (value === null) value = generateDefault(jsonSchema)
    this.tree = await populateJsonTree(value, jsonSchema, name, renamable)
    this.tree.selected = true
    this.selectedNode = this.tree
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  setTree (tree) {
    selectedNode = null
    this.tree = populateTree(tree)
    if (selectedNode) {
      this.selectedNode = selectedNode
    } else {
      this.tree.selected = true
      this.selectedNode = this.tree
    }
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  toggle (node) {
    node.expended = !node.expended
  }

  select (node) {
    if (this.selectedNode) {
      this.selectedNode.selected = false
      this.selectedNode.editingName = false
      this.selectedNode.editingValue = false
    }
    this.selectedNode = node
    node.selected = true
  }

  startEditName (node) {
    node.editingName = true
  }

  stopEditName (node) {
    node.editingName = false
  }

  rename (node, name) {
    node.rename(name)
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  startEditValue (node) {
    node.editingValue = true
  }

  stopEditValue (node) {
    node.editingValue = false
  }

  updateValue (node, value) {
    node.updateValue(value)
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  append (node, child) {
    node.append(child)
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  remove (node) {
    node.remove()
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  validateWithSchema () {
    this.alertMessage = validateWithSchema(this.schema, this.tree.value)
  }

  setAlertMessage (message) {
    this.alertMessage = message
  }

  clearAlertMessage () {
    this.alertMessage = null
  }

  moveUp (node) {
    node.moveUp()
  }

  moveDown (node) {
    node.moveDown()
  }

  validateChild (node, child) {
    return node.validateChild(child)
  }

  async enumerateValidChildren (node) {
    let validChildren = await node.enumerateValidChildren()
    let schema = node.schema
    // check for object
    if (schema.type === 'object') {
      // check for additionalProperties
      let additionalProperties = schema.additionalProperties
      if (typeof additionalProperties === 'undefined' || additionalProperties === true) {
        this.defaultChildren.forEach(child => {
          validChildren.push(cloneTree(child))
        })
      }
    }
    // check for array with additionalItems
    if (schema.type === 'array') {
      if (schema.items) {
        if (Array.isArray(schema.items)) {
          // check for additionalItems
          let additionalItems = schema.additionalItems
          if (typeof additionalItems === 'undefined' || additionalItems === true) {
            this.defaultChildren.forEach(child => {
              let n = cloneTree(child)
              n.renamable = false
              validChildren.push(n)
            })
          }
        }
      } else {
        this.defaultChildren.forEach(child => {
          let n = cloneTree(child)
          n.renamable = false
          validChildren.push(n)
        })
      }
    }
    return validChildren
  }

  async retrieveTypes () {
    // retrieve array of all types
    let types = []
    if (repository) {
      try {
        types = await repository.retrieveTypes()
      } catch (err) {}
    }
    let defaultTypes = await defaultRepository.retrieveTypes()
    defaultTypes.forEach(t => {
      if (types.indexOf(t) === -1) types.push(t)
    })
    return types
  }

  async retrieveSchema (schemaName) {
    return await retrieveSchemaByName(schemaName)
  }

  async populateDefaultChildren () {
    this.defaultChildren = []
    let types = await this.retrieveTypes()
    for (let i = 0; i < types.length; i++) {
      let t = types[i]
      let s = null
      // retrieve schema of type
      if (repository) {
        try {
          s = await repository.retrieveSchema(t)
        } catch (err) {}
      }
      if (!s) s = await defaultRepository.retrieveSchema(t)
      if (s) {
        // use schema to build default object
        let srcSchema = await dereferenceSchema(s)
        let v = generateDefault(srcSchema)
        this.defaultChildren.push(await populateJsonTree(v, srcSchema))
      }
    }
  }

  async addDefaultChild (schema) {
    let srcSchema = await dereferenceSchema(schema)
    let v = generateDefault(srcSchema)
    this.defaultChildren.push(await populateJsonTree(v, srcSchema))
  }

  removeDefaultChild (schema) {
    let index = -1
    for (let i = 0; i < this.defaultChildren.length; i++) {
      if (this.defaultChildren[i].schema.title === schema.title) {
        index = i
        break
      }
    }
    if (index >= 0) this.defaultChildren.splice(index, 1)
  }
}

export default Store
