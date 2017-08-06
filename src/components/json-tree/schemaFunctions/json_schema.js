import clone from 'clone'

// set schema of default to current schema
function defaultValue (node) {
  let schema = clone(node.value)
  node.schema.properties.default = schema
}

var propertyList = {
  'common': [
    '$id',
    '$schema',
    'title',
    'description',
    'definitions',
    'default'
  ],
  'string': [
    'enum',
    'maxLength',
    'minLength',
    'format',
    'pattern'
  ],
  'integer': [
    'enum',
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum'
  ],
  'number': [
    'enum',
    'multipleOf',
    'maximum',
    'exclusiveMaximum',
    'minimum',
    'exclusiveMinimum'
  ],
  'object': [
    'enum',
    'properties',
    'additionalProperties',
    'maxProperties',
    'minProperties',
    'required',
    'dependencies'
  ],
  'array': [
    'enum',
    'items',
    'additionalItems',
    'maxItems',
    'minItems',
    'uniqueItems'
  ]
}

// provide proper properties of current schema
function filterProperties (node) {
  let commonProperties = propertyList.common
  let schema = node.schema
  let type = node.value.type
  delete schema['@visibleProperties']
  if (type) {
    let validProperties = propertyList[type]
    schema['@visibleProperties'] = Array.concat(commonProperties, validProperties)
    return
  }
  if (node.value.enum || node.value.$ref || node.value.oneOf ||
    node.value.allOf || node.value.anyOf || node.value.not) {
    schema['@visibleProperties'] = commonProperties
  }
}

// set schema of enum to current schema
function enumList (node) {
  if (node.parent.value.type) {
    let schema = clone(node.parent.value)
    delete schema.enum
    node.schema.items = schema
  }
}

// provide properties of current schema
function isProperties (element) {
  return element.name === 'properties'
}

function requiredOrDependOnProperties (node) {
  let availableProps = []
  let props = node.name === 'required'
    ? node.parent.children.find(isProperties)
    : (node.parent).parnet.children.find(isProperties)
  if (props) {
    for (let p in props.value) {
      availableProps.push(p)
    }
  }
  node.schema.items.enum = availableProps
}

function dependentProperties (node, newNode) {
  if (node.name === 'dependencies' && node.parent && node.parent.value.type === 'object') {
    let availableProps = []
    let props = node.parent.children.find(isProperties)
    if (props) {
      for (let p in props.value) {
        if (typeof node.value[p] === 'undefined') availableProps.push(p)
      }
    }
    newNode.nameList = availableProps
  }
}

// set property type of numeric schema properties
function numericType (node, schema) {
  let type = node.value.type
  if (type === 'integer' || type === 'number') {
    schema.type = type
  }
}

export default {
  'default-value': defaultValue,
  'filter-properties': filterProperties,
  'enum-list': enumList,
  'required-or-depend-on-properties': requiredOrDependOnProperties,
  'dependent-properties': dependentProperties,
  'numeric-type': numericType
}
